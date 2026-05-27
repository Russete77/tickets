import { create } from 'zustand';
import { apiClient, ApiError } from '../lib/api';
import { secureStorage, StorageKey } from '../lib/storage';
import { User, AuthResponse, AuthTokens } from '../types';

export interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    name: string;
    cpf: string;
    phone?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', {
        email,
        password,
      });

      const { user } = response;
      const accessToken = response.tokens?.token ?? response.accessToken;
      const refreshToken = response.tokens?.refreshToken ?? response.refreshToken;

      // Store tokens securely
      await Promise.all([
        secureStorage.setItem(StorageKey.AUTH_TOKEN, accessToken),
        secureStorage.setItem(StorageKey.REFRESH_TOKEN, refreshToken),
        secureStorage.setJSON(StorageKey.USER_DATA, user),
      ]);

      set({
        user,
        token: accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      const error = err as ApiError;
      const errorMessage = error.message || 'Login failed';
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post<AuthResponse>('/auth/register', data);

      const { user } = response;
      const accessToken = response.tokens?.token ?? response.accessToken;
      const refreshToken = response.tokens?.refreshToken ?? response.refreshToken;

      // Store tokens securely
      await Promise.all([
        secureStorage.setItem(StorageKey.AUTH_TOKEN, accessToken),
        secureStorage.setItem(StorageKey.REFRESH_TOKEN, refreshToken),
        secureStorage.setJSON(StorageKey.USER_DATA, user),
      ]);

      set({
        user,
        token: accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      const error = err as ApiError;
      const errorMessage = error.message || 'Registration failed';
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      // Attempt to notify backend of logout
      try {
        await apiClient.post('/auth/logout');
      } catch {
        // Continue with local logout even if server call fails
      }

      // Clear secure storage
      await secureStorage.clearAll();

      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const error = err as ApiError;
      set({
        error: error.message || 'Logout failed',
        isLoading: false,
      });
      throw error;
    }
  },

  refreshToken: async () => {
    try {
      const currentToken = get().token;
      if (!currentToken) {
        throw new Error('No token to refresh');
      }

      // The API client handles token refresh automatically on 401
      // This method can be called manually to proactively refresh
      const response = await apiClient.post<{ token: string }>('/auth/refresh');

      const newToken = response.token;
      await secureStorage.setItem(StorageKey.AUTH_TOKEN, newToken);

      set({
        token: newToken,
        error: null,
      });
    } catch (err) {
      const error = err as ApiError;
      set({
        error: error.message || 'Token refresh failed',
      });
      throw error;
    }
  },

  loadStoredAuth: async () => {
    set({ isLoading: true });
    try {
      const token = await secureStorage.getItem(StorageKey.AUTH_TOKEN);
      const userData = await secureStorage.getJSON<User>(StorageKey.USER_DATA);

      if (token && userData) {
        set({
          token,
          user: userData,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({
          isLoading: false,
        });
      }
    } catch (err) {
      console.warn('Failed to load stored auth:', err);
      set({
        isLoading: false,
      });
    }
  },

  setUser: (user: User | null) => {
    set({ user });
    if (user) {
      secureStorage.setJSON(StorageKey.USER_DATA, user).catch((err) => {
        console.warn('Failed to store user data:', err);
      });
    }
  },

  setError: (error: string | null) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },
}));
