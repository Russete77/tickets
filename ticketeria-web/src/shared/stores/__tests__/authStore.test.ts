import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '../authStore';

// Mock the API module
vi.mock('@shared/lib/api', () => ({
  api: {
    post: vi.fn(),
    setToken: vi.fn(),
  },
}));

import { api } from '@shared/lib/api';

describe('useAuthStore', () => {
  beforeEach(() => {
    // Clear store state before each test
    const store = useAuthStore.getState();
    store.logout();
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should set user, token, and isAuthenticated on successful login', async () => {
      const mockUser = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'user' as const,
      };
      const mockToken = 'test-token-123';

      vi.mocked(api.post).mockResolvedValueOnce({
        data: { user: mockUser, token: mockToken },
        statusCode: 200,
      });

      const store = useAuthStore.getState();
      await store.login('john@example.com', 'password123');

      const finalState = useAuthStore.getState();
      expect(finalState.user).toEqual(mockUser);
      expect(finalState.token).toBe(mockToken);
      expect(finalState.isAuthenticated).toBe(true);
      expect(api.setToken).toHaveBeenCalledWith(mockToken);
    });

    it('should throw error on failed login', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        statusCode: 401,
        error: 'Invalid credentials',
      });

      const store = useAuthStore.getState();
      await expect(store.login('john@example.com', 'wrongpassword')).rejects.toThrow(
        'Invalid credentials'
      );
    });

    it('should call API with correct credentials', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        data: { user: { id: '1', name: 'John', email: 'john@example.com', role: 'user' }, token: 'token' },
        statusCode: 200,
      });

      const store = useAuthStore.getState();
      await store.login('john@example.com', 'password123');

      expect(api.post).toHaveBeenCalledWith('/v1/auth/login', {
        email: 'john@example.com',
        password: 'password123',
      });
    });
  });

  describe('logout', () => {
    it('should clear user, token, and isAuthenticated', () => {
      useAuthStore.setState({
        user: { id: '1', name: 'John', email: 'john@example.com', role: 'user' },
        token: 'test-token',
        isAuthenticated: true,
      });

      const store = useAuthStore.getState();
      store.logout();

      const finalState = useAuthStore.getState();
      expect(finalState.user).toBeNull();
      expect(finalState.token).toBeNull();
      expect(finalState.isAuthenticated).toBe(false);
      expect(api.setToken).toHaveBeenCalledWith(null);
    });
  });

  describe('register', () => {
    it('should set user, token, and isAuthenticated on successful registration', async () => {
      const mockUser = {
        id: '1',
        name: 'Jane Doe',
        email: 'jane@example.com',
        cpf: '12345678900',
        phone: '11999999999',
        role: 'user' as const,
      };
      const mockToken = 'test-token-456';

      vi.mocked(api.post).mockResolvedValueOnce({
        data: { user: mockUser, token: mockToken },
        statusCode: 200,
      });

      const store = useAuthStore.getState();
      const registerData = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        cpf: '12345678900',
        phone: '11999999999',
        password: 'password123',
      };

      await store.register(registerData);

      const finalState = useAuthStore.getState();
      expect(finalState.user).toEqual(mockUser);
      expect(finalState.token).toBe(mockToken);
      expect(finalState.isAuthenticated).toBe(true);
      expect(api.setToken).toHaveBeenCalledWith(mockToken);
    });

    it('should throw error on failed registration', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        statusCode: 409,
        error: 'Email already exists',
      });

      const store = useAuthStore.getState();
      const registerData = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        cpf: '12345678900',
        phone: '11999999999',
        password: 'password123',
      };

      await expect(store.register(registerData)).rejects.toThrow('Email already exists');
    });

    it('should call API with registration data', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        data: { user: { id: '1', name: 'Jane', email: 'jane@example.com', role: 'user' }, token: 'token' },
        statusCode: 200,
      });

      const store = useAuthStore.getState();
      const registerData = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        cpf: '12345678900',
        phone: '11999999999',
        password: 'password123',
      };

      await store.register(registerData);

      expect(api.post).toHaveBeenCalledWith('/v1/auth/register', registerData);
    });
  });

  describe('setUser', () => {
    it('should update user in store', () => {
      const newUser = {
        id: '2',
        name: 'Updated User',
        email: 'updated@example.com',
        role: 'admin' as const,
      };

      const store = useAuthStore.getState();
      store.setUser(newUser);

      const finalState = useAuthStore.getState();
      expect(finalState.user).toEqual(newUser);
    });

    it('should preserve other state when setting user', () => {
      useAuthStore.setState({
        user: { id: '1', name: 'John', email: 'john@example.com', role: 'user' },
        token: 'test-token',
        isAuthenticated: true,
      });

      const newUser = {
        id: '1',
        name: 'John Updated',
        email: 'john@example.com',
        role: 'user' as const,
      };

      const store = useAuthStore.getState();
      store.setUser(newUser);

      const finalState = useAuthStore.getState();
      expect(finalState.user).toEqual(newUser);
      expect(finalState.token).toBe('test-token');
      expect(finalState.isAuthenticated).toBe(true);
    });
  });
});
