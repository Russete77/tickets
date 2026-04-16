import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserRole } from '../../../generated/prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthService } from '../auth.service';
import { prisma } from '../../../config/database';
import { redis } from '../../../config/redis';
import { env } from '../../../config/env';
import { ConflictError, UnauthorizedError, NotFoundError } from '../../../shared/errors';
import { createMockUser } from '../../../tests/helpers';
import { logAudit } from '../../../shared/audit';
import { jwtKeys } from '../../../config/jwt';

vi.mock('../../../shared/crypto', () => ({
  generateOtpCode: vi.fn(() => '123456'),
  generateTotpSecret: vi.fn(() => 'test-secret'),
  generateUuid: vi.fn(() => 'mock-uuid'),
}));

describe('AuthService', () => {
  const authService = new AuthService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should create a new user with hashed password and return tokens', async () => {
      const mockUser = createMockUser();
      const registerInput = {
        email: 'newuser@example.com',
        cpf: '98765432100',
        name: 'New User',
        phone: '11988888888',
        password: 'SecurePassword123',
      };

      vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(null);
      vi.mocked(prisma.user.create).mockResolvedValueOnce(mockUser);
      vi.mocked(redis.setex).mockResolvedValueOnce('OK');
      vi.mocked(jwt.sign).mockReturnValueOnce('mock-token');

      const result = await authService.register(registerInput);

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ email: registerInput.email }, { cpf: registerInput.cpf }],
        },
      });

      expect(prisma.user.create).toHaveBeenCalled();
      expect(result.user).toEqual(mockUser);
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(logAudit).toHaveBeenCalled();
    });

    it('should throw ConflictError if email already exists', async () => {
      const existingUser = createMockUser();

      vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(existingUser);

      const registerInput = {
        email: existingUser.email,
        cpf: '99999999999',
        name: 'Another User',
        phone: '11999999999',
        password: 'Password123',
      };

      await expect(authService.register(registerInput)).rejects.toThrow(ConflictError);
    });

    it('should throw ConflictError if CPF already exists', async () => {
      const existingUser = createMockUser();

      vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(existingUser);

      const registerInput = {
        email: 'different@example.com',
        cpf: existingUser.cpf,
        name: 'Another User',
        phone: '11999999999',
        password: 'Password123',
      };

      await expect(authService.register(registerInput)).rejects.toThrow(ConflictError);
    });

    it('should hash password with bcrypt', async () => {
      const mockUser = createMockUser();
      const registerInput = {
        email: 'test@example.com',
        cpf: '11111111111',
        name: 'Test',
        phone: '11999999999',
        password: 'PlainPassword',
      };

      vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(null);
      vi.mocked(prisma.user.create).mockResolvedValueOnce(mockUser);
      vi.mocked(redis.setex).mockResolvedValueOnce('OK');

      await authService.register(registerInput);

      expect(bcrypt.hash).toHaveBeenCalledWith(registerInput.password, 12);
    });

    it('should store verification token in Redis', async () => {
      const mockUser = createMockUser();
      const registerInput = {
        email: 'test@example.com',
        cpf: '11111111111',
        name: 'Test',
        phone: null,
        password: 'Password123',
      };

      vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(null);
      vi.mocked(prisma.user.create).mockResolvedValueOnce(mockUser);
      vi.mocked(redis.setex).mockResolvedValueOnce('OK');

      await authService.register(registerInput);

      expect(redis.setex).toHaveBeenCalled();
      const call = vi.mocked(redis.setex).mock.calls[0];
      expect(call[0]).toContain('email_verification');
    });
  });

  describe('login', () => {
    it('should return user and tokens for valid credentials', async () => {
      const mockUser = createMockUser({ totpEnabled: false });

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true);

      const result = await authService.login('test@example.com', 'password123');

      expect(result.user).toEqual(mockUser);
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_LOGIN',
        })
      );
    });

    it('should throw UnauthorizedError if user not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      await expect(authService.login('notfound@example.com', 'password')).rejects.toThrow(
        UnauthorizedError
      );

      expect(logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ reason: 'user_not_found' }),
        })
      );
    });

    it('should throw UnauthorizedError if password is invalid', async () => {
      const mockUser = createMockUser();

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(false);

      await expect(authService.login('test@example.com', 'wrongpassword')).rejects.toThrow(
        UnauthorizedError
      );

      expect(logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ reason: 'invalid_password' }),
        })
      );
    });

    it('should return 2FA pending token if 2FA is enabled', async () => {
      const mockUser = createMockUser({ totpEnabled: true, totpSecret: 'test-secret' });

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true);
      vi.mocked(redis.setex).mockResolvedValueOnce('OK');

      const result = await authService.login('test@example.com', 'password123');

      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBe('');
      expect(redis.setex).toHaveBeenCalled();
    });

    it('should log audit trail on successful login', async () => {
      const mockUser = createMockUser({ totpEnabled: false });

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true);

      await authService.login('test@example.com', 'password123');

      expect(logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: mockUser.id,
          action: 'USER_LOGIN',
          entityId: mockUser.id,
        })
      );
    });
  });

  describe('verify2FA', () => {
    it('should return tokens for valid 2FA code', async () => {
      const mockUser = createMockUser({ totpEnabled: true, totpSecret: 'test-secret' });

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);
      vi.mocked(redis.del).mockResolvedValueOnce(1);

      const result = await authService.verify2FA(mockUser.id, '123456');

      expect(result.user).toEqual(mockUser);
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(redis.del).toHaveBeenCalledWith(`2fa_pending:${mockUser.id}`);
    });

    it('should throw UnauthorizedError for invalid 2FA code', async () => {
      const mockUser = createMockUser({ totpEnabled: true, totpSecret: 'test-secret' });

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);
      vi.mocked(jwt).verify = vi.fn(() => ({
        check: vi.fn(() => false),
      }));

      await expect(authService.verify2FA(mockUser.id, 'invalid')).rejects.toThrow(
        UnauthorizedError
      );
    });

    it('should throw error if 2FA is not enabled', async () => {
      const mockUser = createMockUser({ totpEnabled: false });

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);

      await expect(authService.verify2FA(mockUser.id, '123456')).rejects.toThrow();
    });
  });

  describe('refreshToken', () => {
    it('should generate new tokens with valid refresh token', async () => {
      const mockUser = createMockUser();
      const oldToken = 'old-refresh-token';

      vi.mocked(jwt.verify).mockReturnValueOnce({ userId: mockUser.id } as any);
      vi.mocked(redis.get).mockResolvedValueOnce(oldToken);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);
      vi.mocked(redis.del).mockResolvedValueOnce(1);

      const result = await authService.refreshToken(oldToken);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(redis.del).toHaveBeenCalledWith(`refresh_token:${mockUser.id}`);
    });

    it('should throw UnauthorizedError if refresh token is expired', async () => {
      const oldToken = 'expired-token';

      vi.mocked(jwt.verify).mockImplementationOnce(() => {
        throw new jwt.TokenExpiredError('Token expired', new Date());
      });

      await expect(authService.refreshToken(oldToken)).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError if refresh token not in Redis', async () => {
      const mockUser = createMockUser();

      vi.mocked(jwt.verify).mockReturnValueOnce({ userId: mockUser.id } as any);
      vi.mocked(redis.get).mockResolvedValueOnce(null);

      await expect(authService.refreshToken('some-token')).rejects.toThrow(UnauthorizedError);
    });

    it('should throw NotFoundError if user not found', async () => {
      const userId = 'nonexistent';

      vi.mocked(jwt.verify).mockReturnValueOnce({ userId } as any);
      vi.mocked(redis.get).mockResolvedValueOnce('token');
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      await expect(authService.refreshToken('some-token')).rejects.toThrow(NotFoundError);
    });
  });

  describe('generateTokens', () => {
    it('should sign access token with RS256 and private key', async () => {
      const mockUser = createMockUser();

      vi.mocked(redis.setex).mockResolvedValueOnce('OK');
      vi.mocked(jwt.sign).mockReturnValueOnce('access-token');
      vi.mocked(jwt.sign).mockReturnValueOnce('refresh-token');

      const result = (authService as any).generateTokens(mockUser);

      // First call is access token — must use RS256 + private key
      const accessCall = vi.mocked(jwt.sign).mock.calls[0];
      expect(accessCall[1]).toBe(jwtKeys.privateKey);
      expect(accessCall[2]).toEqual(
        expect.objectContaining({ algorithm: 'RS256' })
      );

      // Second call is refresh token — stays HS256 + symmetric secret
      const refreshCall = vi.mocked(jwt.sign).mock.calls[1];
      expect(refreshCall[1]).toBe(env.JWT_REFRESH_SECRET);
      expect(refreshCall[2]).not.toEqual(
        expect.objectContaining({ algorithm: 'RS256' })
      );
    });

    it('should generate access and refresh tokens', async () => {
      const mockUser = createMockUser();

      vi.mocked(redis.setex).mockResolvedValueOnce('OK');
      vi.mocked(jwt.sign).mockReturnValueOnce('access-token');
      vi.mocked(jwt.sign).mockReturnValueOnce('refresh-token');

      const result = (authService as any).generateTokens(mockUser);

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.expiresIn).toBe(900);
    });

    it('should store refresh token in Redis with TTL', async () => {
      const mockUser = createMockUser();

      vi.mocked(redis.setex).mockResolvedValueOnce('OK');

      (authService as any).generateTokens(mockUser);

      expect(redis.setex).toHaveBeenCalled();
      const call = vi.mocked(redis.setex).mock.calls[0];
      expect(call[0]).toContain('refresh_token');
      expect(call[1]).toBe(7 * 24 * 60 * 60);
    });
  });
});
