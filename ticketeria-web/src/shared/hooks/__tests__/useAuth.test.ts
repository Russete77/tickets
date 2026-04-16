import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { useAuthStore } from '@shared/stores/authStore';

describe('useAuth', () => {
  beforeEach(() => {
    // Clear store state before each test
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should return user from store', () => {
    const mockUser = {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'user' as const,
    };

    useAuthStore.setState({
      user: mockUser,
      token: 'test-token',
      isAuthenticated: true,
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toBe('test-token');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should return login function', () => {
    const { result } = renderHook(() => useAuth());

    expect(typeof result.current.login).toBe('function');
  });

  it('should return logout function', () => {
    const { result } = renderHook(() => useAuth());

    expect(typeof result.current.logout).toBe('function');
  });

  it('should return register function', () => {
    const { result } = renderHook(() => useAuth());

    expect(typeof result.current.register).toBe('function');
  });

  it('should return setUser function', () => {
    const { result } = renderHook(() => useAuth());

    expect(typeof result.current.setUser).toBe('function');
  });

  it('should reflect store updates', () => {
    const { result, rerender } = renderHook(() => useAuth());

    expect(result.current.isAuthenticated).toBe(false);

    useAuthStore.setState({
      user: { id: '1', name: 'John', email: 'john@example.com', role: 'user' },
      token: 'test-token',
      isAuthenticated: true,
    });

    rerender();

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.name).toBe('John');
  });

  it('should have access to all auth store methods', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current).toHaveProperty('user');
    expect(result.current).toHaveProperty('token');
    expect(result.current).toHaveProperty('isAuthenticated');
    expect(result.current).toHaveProperty('login');
    expect(result.current).toHaveProperty('logout');
    expect(result.current).toHaveProperty('register');
    expect(result.current).toHaveProperty('setUser');
  });

  it('should work with admin role', () => {
    const adminUser = {
      id: '2',
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin' as const,
    };

    useAuthStore.setState({
      user: adminUser,
      token: 'admin-token',
      isAuthenticated: true,
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.user?.role).toBe('admin');
  });

  it('should work with organizer role', () => {
    const organizerUser = {
      id: '3',
      name: 'Organizer User',
      email: 'organizer@example.com',
      role: 'organizer' as const,
    };

    useAuthStore.setState({
      user: organizerUser,
      token: 'organizer-token',
      isAuthenticated: true,
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.user?.role).toBe('organizer');
  });
});
