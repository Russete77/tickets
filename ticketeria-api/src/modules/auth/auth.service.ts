import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { env } from '../../config/env';
import { jwtKeys } from '../../config/jwt';
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
} from '../../shared/errors';
import { logAudit, AuditActions } from '../../shared/audit';
import { RegisterInput, LoginInput, Verify2faInput, ResetPasswordInput } from './auth.validators';
import { User, UserRole } from '../../generated/prisma/client';
import { emailService } from '../notifications/email.service';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Serviço de autenticação com JWT, 2FA (TOTP) e gerenciamento de sessão
 */
export class AuthService {
  /**
   * Registra um novo usuário
   */
  async register(data: RegisterInput): Promise<{ user: User; tokens: TokenPair }> {
    // Verificar se o usuário já existe
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { cpf: data.cpf }],
      },
    });

    if (existingUser) {
      throw new ConflictError('Email ou CPF já cadastrado');
    }

    // Hash da senha com bcrypt (cost 12)
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        email: data.email,
        cpf: data.cpf,
        name: data.name,
        phone: data.phone || null,
        passwordHash,
        role: UserRole.consumer,
      },
    });

    // Log de auditoria
    await logAudit({
      actorId: user.id,
      action: AuditActions.USER_REGISTERED,
      entityType: 'user',
      entityId: user.id,
    });

    // Enviar email de verificação
    const verificationToken = jwt.sign(
      { userId: user.id, type: 'email_verification' },
      env.JWT_REFRESH_SECRET,
      { expiresIn: '24h' }
    );

    await redis.setex(
      `email_verification:${user.id}`,
      24 * 60 * 60,
      verificationToken
    );

    // Send welcome email asynchronously
    emailService.sendWelcome(user).catch((err) => {
      console.error('Failed to send welcome email:', err);
    });

    // Gerar tokens
    const tokens = this.generateTokens(user);

    return { user, tokens };
  }

  /**
   * Login com email e senha
   */
  async login(email: string, password: string): Promise<{ user: User; tokens: TokenPair }> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      await logAudit({
        action: AuditActions.USER_LOGIN_FAILED,
        entityType: 'user',
        entityId: 'unknown',
        metadata: { reason: 'user_not_found', email },
      });
      throw new UnauthorizedError('Email ou senha inválidos');
    }

    // Verificar senha
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      await logAudit({
        actorId: user.id,
        action: AuditActions.USER_LOGIN_FAILED,
        entityType: 'user',
        entityId: user.id,
        metadata: { reason: 'invalid_password' },
      });
      throw new UnauthorizedError('Email ou senha inválidos');
    }

    // Se 2FA está ativado, solicitar verificação
    if (user.totpEnabled) {
      // Gerar token temporário válido por 5 minutos para verificar 2FA
      const twoFAToken = jwt.sign(
        { userId: user.id, type: '2fa_pending' },
        env.JWT_REFRESH_SECRET,
        { expiresIn: '5m' }
      );

      await redis.setex(`2fa_pending:${user.id}`, 5 * 60, twoFAToken);

      return {
        user,
        tokens: {
          accessToken: twoFAToken,
          refreshToken: '',
          expiresIn: 5 * 60,
        },
      };
    }

    await logAudit({
      actorId: user.id,
      action: AuditActions.USER_LOGIN,
      entityType: 'user',
      entityId: user.id,
    });

    const tokens = this.generateTokens(user);

    return { user, tokens };
  }

  /**
   * Verificar 2FA (TOTP)
   */
  async verify2FA(userId: string, code: string): Promise<{ user: User; tokens: TokenPair }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.totpSecret || !user.totpEnabled) {
      throw new BadRequestError('2FA não está ativado para este usuário');
    }

    // Verificar código TOTP (com tolerância de 1 janela)
    const isValid = authenticator.check(code, user.totpSecret);
    if (!isValid) {
      await logAudit({
        actorId: user.id,
        action: AuditActions.USER_LOGIN_FAILED,
        entityType: 'user',
        entityId: user.id,
        metadata: { reason: 'invalid_2fa_code' },
      });
      throw new UnauthorizedError('Código 2FA inválido');
    }

    // Limpar token temporário de 2FA
    await redis.del(`2fa_pending:${user.id}`);

    await logAudit({
      actorId: user.id,
      action: AuditActions.USER_LOGIN,
      entityType: 'user',
      entityId: user.id,
      metadata: { method: '2fa' },
    });

    const tokens = this.generateTokens(user);

    return { user, tokens };
  }

  /**
   * Atualizar access token usando refresh token
   */
  async refreshToken(token: string): Promise<TokenPair> {
    try {
      const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string };

      // Verificar se refresh token está em Redis
      const storedToken = await redis.get(`refresh_token:${payload.userId}`);
      if (storedToken !== token) {
        throw new UnauthorizedError('Refresh token inválido ou expirado');
      }

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) {
        throw new NotFoundError('Usuário não encontrado');
      }

      // Revogar refresh token antigo
      await redis.del(`refresh_token:${payload.userId}`);

      // Gerar novos tokens
      return this.generateTokens(user);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Refresh token expirado');
      }
      throw new UnauthorizedError('Refresh token inválido');
    }
  }

  /**
   * Verificar email
   */
  async verifyEmail(userId: string, token: string): Promise<User> {
    try {
      jwt.verify(token, env.JWT_REFRESH_SECRET);
    } catch {
      throw new UnauthorizedError('Token de verificação inválido ou expirado');
    }

    const storedToken = await redis.get(`email_verification:${userId}`);
    if (storedToken !== token) {
      throw new UnauthorizedError('Token de verificação inválido');
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });

    await redis.del(`email_verification:${userId}`);

    return user;
  }

  /**
   * Solicitar reset de senha
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Não revelar se o email existe
      return;
    }

    // Gerar token de reset
    const resetToken = jwt.sign(
      { userId: user.id, type: 'password_reset' },
      env.JWT_REFRESH_SECRET,
      { expiresIn: '1h' }
    );

    // Armazenar em Redis com TTL de 1h
    await redis.setex(
      `password_reset:${user.id}`,
      60 * 60,
      resetToken
    );

    // Send password reset email asynchronously
    emailService.sendPasswordReset(user, resetToken).catch((err) => {
      console.error('Failed to send password reset email:', err);
    });
  }

  /**
   * Resetar senha
   */
  async resetPassword(userId: string, token: string, newPassword: string): Promise<User> {
    try {
      jwt.verify(token, env.JWT_REFRESH_SECRET);
    } catch {
      throw new UnauthorizedError('Token de reset inválido ou expirado');
    }

    const storedToken = await redis.get(`password_reset:${userId}`);
    if (storedToken !== token) {
      throw new UnauthorizedError('Token de reset inválido');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    // Hash da nova senha
    const passwordHash = await bcrypt.hash(newPassword, 12);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await redis.del(`password_reset:${userId}`);

    await logAudit({
      actorId: userId,
      action: AuditActions.USER_PASSWORD_RESET,
      entityType: 'user',
      entityId: userId,
    });

    return updatedUser;
  }

  /**
   * Habilitar 2FA (TOTP)
   */
  async enable2FA(userId: string): Promise<{ secret: string; qrCode: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    if (user.totpEnabled) {
      throw new BadRequestError('2FA já está ativado para este usuário');
    }

    // Gerar secret TOTP
    const secret = authenticator.generateSecret();

    // Gerar URL para QR code
    const qrCode = authenticator.keyuri(
      user.email,
      'Ticketeria',
      secret
    );

    // Armazenar temporariamente em Redis (válido por 10 minutos)
    await redis.setex(
      `2fa_pending:${user.id}`,
      10 * 60,
      secret
    );

    return { secret, qrCode };
  }

  /**
   * Confirmar 2FA (após scannear QR code)
   */
  async confirm2FA(userId: string, code: string): Promise<User> {
    const secret = await redis.get(`2fa_pending:${userId}`);
    if (!secret) {
      throw new BadRequestError('Requisição de 2FA expirada');
    }

    // Verificar código TOTP
    const isValid = authenticator.check(code, secret);
    if (!isValid) {
      throw new BadRequestError('Código 2FA inválido');
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        totpSecret: secret,
        totpEnabled: true,
      },
    });

    await redis.del(`2fa_pending:${userId}`);

    await logAudit({
      actorId: userId,
      action: AuditActions.USER_2FA_ENABLED,
      entityType: 'user',
      entityId: userId,
    });

    return user;
  }

  /**
   * Desabilitar 2FA
   */
  async disable2FA(userId: string, password: string): Promise<User> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    // Verificar senha para confirmar
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Senha inválida');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        totpSecret: null,
        totpEnabled: false,
      },
    });

    return updatedUser;
  }

  /**
   * Gerar par de tokens JWT (access + refresh)
   */
  private generateTokens(user: User): TokenPair {
    const accessPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const refreshPayload = {
      userId: user.id,
    };

    // Access token: RS256 with private key (verifiable by public key)
    const accessToken = jwt.sign(
      accessPayload,
      jwtKeys.privateKey,
      { algorithm: 'RS256', expiresIn: env.JWT_ACCESS_EXPIRES_IN }
    );

    // Refresh token: HS256 with symmetric secret (server-side only)
    const refreshToken = jwt.sign(
      refreshPayload,
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
    );

    // Armazenar refresh token em Redis para invalidacao
    const refreshExpiresIn = 7 * 24 * 60 * 60; // 7 dias
    redis.setex(`refresh_token:${user.id}`, refreshExpiresIn, refreshToken).catch((err) => {
      console.error('Erro ao armazenar refresh token em Redis:', err);
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutos
    };
  }
}

export const authService = new AuthService();
