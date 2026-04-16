import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CartItem {
  id: string; // Unique ID for cart item
  eventId: string;
  batchId: string;
  batchName: string;
  quantity: number;
  price: number; // Price per unit in cents
  holderName: string;
  holderCPF: string;
  holderEmail?: string;
  holderPhone?: string;
}

export interface CartStore {
  items: CartItem[];
  total: number;

  // Actions
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateHolder: (
    itemId: string,
    data: {
      holderName?: string;
      holderCPF?: string;
      holderEmail?: string;
      holderPhone?: string;
    }
  ) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
  getItemByBatch: (batchId: string) => CartItem | undefined;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      total: 0,

      addItem: (item) => {
        const { items } = get();
        // Check if item with same batch and holder already exists
        const existingIndex = items.findIndex(
          (i) =>
            i.batchId === item.batchId &&
            i.holderCPF === item.holderCPF &&
            i.eventId === item.eventId
        );

        let newItems: CartItem[];

        if (existingIndex >= 0) {
          // Update quantity if exists
          newItems = [...items];
          newItems[existingIndex].quantity += item.quantity;
        } else {
          // Add new item
          const newItem: CartItem = {
            ...item,
            id: `${Date.now()}-${Math.random()}`,
          };
          newItems = [...items, newItem];
        }

        set({
          items: newItems,
          total: calculateTotal(newItems),
        });
      },

      removeItem: (itemId: string) => {
        const { items } = get();
        const newItems = items.filter((item) => item.id !== itemId);
        set({
          items: newItems,
          total: calculateTotal(newItems),
        });
      },

      updateQuantity: (itemId: string, quantity: number) => {
        if (quantity < 1) {
          get().removeItem(itemId);
          return;
        }

        const { items } = get();
        const newItems = items.map((item) =>
          item.id === itemId ? { ...item, quantity } : item
        );

        set({
          items: newItems,
          total: calculateTotal(newItems),
        });
      },

      updateHolder: (itemId, data) => {
        const { items } = get();
        const newItems = items.map((item) =>
          item.id === itemId ? { ...item, ...data } : item
        );

        set({ items: newItems });
      },

      clearCart: () => {
        set({
          items: [],
          total: 0,
        });
      },

      getTotal: () => {
        return get().total;
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      getItemByBatch: (batchId: string) => {
        return get().items.find((item) => item.batchId === batchId);
      },
    }),
    {
      name: 'ticketeria-cart',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    }
  )
);

function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
