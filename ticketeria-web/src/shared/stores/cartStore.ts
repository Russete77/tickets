import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  batchId: string;
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  eventCover: string;
  batchName: string;
  batchType: 'normal' | 'vip' | 'backstage' | 'camarote';
  price: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (batchId: string) => void;
  updateQuantity: (batchId: string, quantity: number) => void;
  getTotal: () => number;
  getItemCount: () => number;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const { items } = get();
        const existing = items.find((i) => i.batchId === item.batchId);
        if (existing) {
          set({
            items: items.map((i) =>
              i.batchId === item.batchId
                ? { ...i, quantity: i.quantity + (item.quantity ?? 1) }
                : i
            ),
          });
        } else {
          set({ items: [...items, { ...item, quantity: item.quantity ?? 1 }] });
        }
      },

      removeItem: (batchId) => {
        set({ items: get().items.filter((i) => i.batchId !== batchId) });
      },

      updateQuantity: (batchId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(batchId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.batchId === batchId ? { ...i, quantity } : i
          ),
        });
      },

      getTotal: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      clear: () => set({ items: [] }),
    }),
    { name: 'cart-storage' }
  )
);
