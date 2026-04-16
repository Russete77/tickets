import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore, type CartItem } from '../cartStore';

describe('useCartStore', () => {
  beforeEach(() => {
    // Clear store state before each test
    const store = useCartStore.getState();
    store.clear();
  });

  const mockItem: Omit<CartItem, 'quantity'> = {
    batchId: 'batch-1',
    eventId: 'event-1',
    eventSlug: 'event-1-slug',
    eventTitle: 'Test Event',
    eventCover: 'https://example.com/cover.jpg',
    batchName: 'VIP Batch',
    batchType: 'vip',
    price: 10000, // 100 reais in cents
  };

  describe('addItem', () => {
    it('should add a new item to cart', () => {
      const store = useCartStore.getState();
      store.addItem(mockItem);

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0]).toEqual({
        ...mockItem,
        quantity: 1,
      });
    });

    it('should add item with custom quantity', () => {
      const store = useCartStore.getState();
      store.addItem({ ...mockItem, quantity: 5 });

      const items = useCartStore.getState().items;
      expect(items[0].quantity).toBe(5);
    });

    it('should increase quantity when adding existing item', () => {
      const store = useCartStore.getState();
      store.addItem(mockItem);
      store.addItem({ ...mockItem, quantity: 2 });

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(3);
    });

    it('should add multiple different items', () => {
      const store = useCartStore.getState();
      const item2 = { ...mockItem, batchId: 'batch-2' };

      store.addItem(mockItem);
      store.addItem(item2);

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(2);
    });
  });

  describe('removeItem', () => {
    it('should remove item by batchId', () => {
      const store = useCartStore.getState();
      store.addItem(mockItem);
      expect(useCartStore.getState().items).toHaveLength(1);

      store.removeItem('batch-1');
      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it('should not affect other items when removing one', () => {
      const store = useCartStore.getState();
      const item2 = { ...mockItem, batchId: 'batch-2' };

      store.addItem(mockItem);
      store.addItem(item2);

      store.removeItem('batch-1');

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].batchId).toBe('batch-2');
    });

    it('should handle removing non-existent item gracefully', () => {
      const store = useCartStore.getState();
      store.addItem(mockItem);

      store.removeItem('non-existent-batch');

      expect(useCartStore.getState().items).toHaveLength(1);
    });
  });

  describe('updateQuantity', () => {
    it('should update item quantity', () => {
      const store = useCartStore.getState();
      store.addItem(mockItem);

      store.updateQuantity('batch-1', 5);

      expect(useCartStore.getState().items[0].quantity).toBe(5);
    });

    it('should remove item when quantity is set to 0', () => {
      const store = useCartStore.getState();
      store.addItem(mockItem);

      store.updateQuantity('batch-1', 0);

      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it('should remove item when quantity is set to negative', () => {
      const store = useCartStore.getState();
      store.addItem(mockItem);

      store.updateQuantity('batch-1', -1);

      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it('should not affect other items when updating one', () => {
      const store = useCartStore.getState();
      const item2 = { ...mockItem, batchId: 'batch-2', price: 5000 };

      store.addItem(mockItem);
      store.addItem(item2);

      store.updateQuantity('batch-1', 3);

      const items = useCartStore.getState().items;
      expect(items[0].quantity).toBe(3);
      expect(items[1].quantity).toBe(1);
    });
  });

  describe('getTotal', () => {
    it('should return 0 for empty cart', () => {
      const store = useCartStore.getState();
      expect(store.getTotal()).toBe(0);
    });

    it('should calculate total for single item', () => {
      const store = useCartStore.getState();
      store.addItem(mockItem);

      // 10000 * 1 = 10000 cents
      expect(store.getTotal()).toBe(10000);
    });

    it('should calculate total for single item with quantity > 1', () => {
      const store = useCartStore.getState();
      store.addItem({ ...mockItem, quantity: 3 });

      // 10000 * 3 = 30000 cents
      expect(store.getTotal()).toBe(30000);
    });

    it('should calculate total for multiple items', () => {
      const store = useCartStore.getState();
      const item2 = { ...mockItem, batchId: 'batch-2', price: 5000, quantity: 2 };

      store.addItem({ ...mockItem, quantity: 2 });
      store.addItem(item2);

      // (10000 * 2) + (5000 * 2) = 20000 + 10000 = 30000
      expect(store.getTotal()).toBe(30000);
    });
  });

  describe('getItemCount', () => {
    it('should return 0 for empty cart', () => {
      const store = useCartStore.getState();
      expect(store.getItemCount()).toBe(0);
    });

    it('should return quantity for single item', () => {
      const store = useCartStore.getState();
      store.addItem({ ...mockItem, quantity: 3 });

      expect(store.getItemCount()).toBe(3);
    });

    it('should return total quantity for multiple items', () => {
      const store = useCartStore.getState();
      const item2 = { ...mockItem, batchId: 'batch-2', quantity: 2 };

      store.addItem({ ...mockItem, quantity: 3 });
      store.addItem(item2);

      // 3 + 2 = 5
      expect(store.getItemCount()).toBe(5);
    });

    it('should update when quantity is changed', () => {
      const store = useCartStore.getState();
      store.addItem({ ...mockItem, quantity: 2 });
      expect(store.getItemCount()).toBe(2);

      store.updateQuantity('batch-1', 5);
      expect(store.getItemCount()).toBe(5);
    });
  });

  describe('clear', () => {
    it('should clear all items from cart', () => {
      const store = useCartStore.getState();
      const item2 = { ...mockItem, batchId: 'batch-2' };

      store.addItem(mockItem);
      store.addItem(item2);
      expect(useCartStore.getState().items).toHaveLength(2);

      store.clear();

      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it('should handle clearing empty cart', () => {
      const store = useCartStore.getState();
      store.clear();

      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it('should reset totals after clearing', () => {
      const store = useCartStore.getState();
      store.addItem(mockItem);

      store.clear();

      expect(store.getTotal()).toBe(0);
      expect(store.getItemCount()).toBe(0);
    });
  });
});
