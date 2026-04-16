import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useToastStore } from '../toastStore';

describe('useToastStore', () => {
  beforeEach(() => {
    // Clear store state before each test
    useToastStore.setState({ toasts: [] });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('addToast', () => {
    it('should add a toast with generated id', () => {
      const store = useToastStore.getState();
      store.addToast({
        message: 'Test message',
        type: 'success',
      });

      const toasts = useToastStore.getState().toasts;
      expect(toasts).toHaveLength(1);
      expect(toasts[0].message).toBe('Test message');
      expect(toasts[0].type).toBe('success');
      expect(toasts[0].id).toBeDefined();
    });

    it('should add multiple toasts', () => {
      const store = useToastStore.getState();
      store.addToast({
        message: 'First message',
        type: 'success',
      });
      store.addToast({
        message: 'Second message',
        type: 'error',
      });

      expect(useToastStore.getState().toasts).toHaveLength(2);
    });

    it('should set default duration to 4000ms', () => {
      const store = useToastStore.getState();
      store.addToast({
        message: 'Test message',
        type: 'info',
      });

      expect(useToastStore.getState().toasts[0].duration).toBe(4000);
    });

    it('should respect custom duration', () => {
      const store = useToastStore.getState();
      store.addToast({
        message: 'Test message',
        type: 'warning',
        duration: 2000,
      });

      expect(useToastStore.getState().toasts[0].duration).toBe(2000);
    });

    it('should auto-remove toast after duration', () => {
      const store = useToastStore.getState();
      store.addToast({
        message: 'Test message',
        type: 'success',
        duration: 2000,
      });

      expect(useToastStore.getState().toasts).toHaveLength(1);

      vi.advanceTimersByTime(2000);

      expect(useToastStore.getState().toasts).toHaveLength(0);
    });

    it('should use default duration (4000ms) for auto-removal if not specified', () => {
      const store = useToastStore.getState();
      store.addToast({
        message: 'Test message',
        type: 'success',
      });

      expect(useToastStore.getState().toasts).toHaveLength(1);

      vi.advanceTimersByTime(3999);
      expect(useToastStore.getState().toasts).toHaveLength(1);

      vi.advanceTimersByTime(1);
      expect(useToastStore.getState().toasts).toHaveLength(0);
    });

    it('should handle multiple toasts with different durations', () => {
      const store = useToastStore.getState();
      store.addToast({
        message: 'Fast toast',
        type: 'success',
        duration: 1000,
      });
      store.addToast({
        message: 'Slow toast',
        type: 'error',
        duration: 3000,
      });

      expect(useToastStore.getState().toasts).toHaveLength(2);

      vi.advanceTimersByTime(1000);
      let toasts = useToastStore.getState().toasts;
      expect(toasts).toHaveLength(1);
      expect(toasts[0].message).toBe('Slow toast');

      vi.advanceTimersByTime(2000);
      expect(useToastStore.getState().toasts).toHaveLength(0);
    });
  });

  describe('removeToast', () => {
    it('should remove toast by id', () => {
      const store = useToastStore.getState();
      store.addToast({
        message: 'Test message',
        type: 'success',
      });

      let toasts = useToastStore.getState().toasts;
      const toastId = toasts[0].id;
      store.removeToast(toastId);

      expect(useToastStore.getState().toasts).toHaveLength(0);
    });

    it('should only remove specified toast', () => {
      const store = useToastStore.getState();
      store.addToast({
        message: 'First message',
        type: 'success',
      });
      store.addToast({
        message: 'Second message',
        type: 'error',
      });

      let toasts = useToastStore.getState().toasts;
      const firstToastId = toasts[0].id;
      store.removeToast(firstToastId);

      toasts = useToastStore.getState().toasts;
      expect(toasts).toHaveLength(1);
      expect(toasts[0].message).toBe('Second message');
    });

    it('should handle removing non-existent toast', () => {
      const store = useToastStore.getState();
      store.addToast({
        message: 'Test message',
        type: 'success',
      });

      store.removeToast('non-existent-id');

      expect(useToastStore.getState().toasts).toHaveLength(1);
    });

    it('should clear store when removing all toasts', () => {
      const store = useToastStore.getState();
      store.addToast({
        message: 'First message',
        type: 'success',
      });
      store.addToast({
        message: 'Second message',
        type: 'error',
      });

      let toasts = useToastStore.getState().toasts;
      const firstToastId = toasts[0].id;
      const secondToastId = toasts[1].id;

      store.removeToast(firstToastId);
      store.removeToast(secondToastId);

      expect(useToastStore.getState().toasts).toHaveLength(0);
    });
  });

  describe('toast types', () => {
    it('should support success type', () => {
      const store = useToastStore.getState();
      store.addToast({
        message: 'Success',
        type: 'success',
      });

      expect(useToastStore.getState().toasts[0].type).toBe('success');
    });

    it('should support error type', () => {
      const store = useToastStore.getState();
      store.addToast({
        message: 'Error',
        type: 'error',
      });

      expect(useToastStore.getState().toasts[0].type).toBe('error');
    });

    it('should support info type', () => {
      const store = useToastStore.getState();
      store.addToast({
        message: 'Info',
        type: 'info',
      });

      expect(useToastStore.getState().toasts[0].type).toBe('info');
    });

    it('should support warning type', () => {
      const store = useToastStore.getState();
      store.addToast({
        message: 'Warning',
        type: 'warning',
      });

      expect(useToastStore.getState().toasts[0].type).toBe('warning');
    });
  });
});
