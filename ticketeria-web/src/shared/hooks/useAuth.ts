import { useAuthStore } from '@shared/stores/authStore';

export function useAuth() {
  const { user, token, isAuthenticated, login, logout, register, setUser } = useAuthStore();

  return {
    user,
    token,
    isAuthenticated,
    login,
    logout,
    register,
    setUser,
  };
}
