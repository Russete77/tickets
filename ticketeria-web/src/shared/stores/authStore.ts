import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@shared/lib/api';

export interface User {
  id: string;
  name: string;
  email: string;
  cpf?: string;
  phone?: string;
  avatar?: string;
  role: 'user' | 'admin' | 'organizer';
}

interface RegisterData {
  name: string;
  email: string;
  cpf: string;
  phone: string;
  password: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (data: RegisterData) => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const response = await api.post<{ user: User; token: string }>('/v1/auth/login', {
          email,
          password,
        });
        if (response.error) throw new Error(response.error);
        const { user, token } = response.data!;
        api.setToken(token);
        set({ user, token, isAuthenticated: true });
      },

      logout: () => {
        api.setToken(null);
        set({ user: null, token: null, isAuthenticated: false });
      },

      register: async (data) => {
        const response = await api.post<{ user: User; token: string }>('/v1/auth/register', data);
        if (response.error) throw new Error(response.error);
        const { user, token } = response.data!;
        api.setToken(token);
        set({ user, token, isAuthenticated: true });
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          api.setToken(state.token);
        }
      },
    }
  )
);
