import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ticket } from '../types';

export interface OfflineTicket extends Ticket {
  syncedAt: string;
  lastOfflineCheckinsCount: number;
}

export interface TicketStore {
  offlineTickets: OfflineTicket[];
  lastSyncedAt: string | null;

  // Actions
  cacheTicket: (ticket: Ticket) => void;
  removeTicket: (ticketId: string) => void;
  getTicketByHash: (ticketHash: string) => OfflineTicket | undefined;
  getTicketById: (ticketId: string) => OfflineTicket | undefined;
  getTicketsByEvent: (eventId: string) => OfflineTicket[];
  syncOfflineCheckins: (
    ticketId: string,
    newCheckinsCount: number
  ) => void;
  clearOfflineTickets: () => void;
  getOfflineTicketsNeedingSync: () => OfflineTicket[];
}

export const useTicketStore = create<TicketStore>()(
  persist(
    (set, get) => ({
      offlineTickets: [],
      lastSyncedAt: null,

      cacheTicket: (ticket: Ticket) => {
        const { offlineTickets } = get();
        const existingIndex = offlineTickets.findIndex(
          (t) => t.id === ticket.id
        );

        const now = new Date().toISOString();
        const offlineTicket: OfflineTicket = {
          ...ticket,
          syncedAt: now,
          lastOfflineCheckinsCount: ticket.checkins?.length ?? 0,
        };

        let newTickets: OfflineTicket[];

        if (existingIndex >= 0) {
          // Update existing
          newTickets = [...offlineTickets];
          newTickets[existingIndex] = offlineTicket;
        } else {
          // Add new
          newTickets = [...offlineTickets, offlineTicket];
        }

        set({
          offlineTickets: newTickets,
          lastSyncedAt: now,
        });
      },

      removeTicket: (ticketId: string) => {
        const { offlineTickets } = get();
        set({
          offlineTickets: offlineTickets.filter((t) => t.id !== ticketId),
        });
      },

      getTicketByHash: (ticketHash: string) => {
        return get().offlineTickets.find((t) => t.ticketHash === ticketHash);
      },

      getTicketById: (ticketId: string) => {
        return get().offlineTickets.find((t) => t.id === ticketId);
      },

      getTicketsByEvent: (eventId: string) => {
        return get().offlineTickets.filter((t) => t.eventId === eventId);
      },

      syncOfflineCheckins: (ticketId: string, newCheckinsCount: number) => {
        const { offlineTickets } = get();
        const newTickets = offlineTickets.map((ticket) => {
          if (ticket.id === ticketId) {
            return {
              ...ticket,
              lastOfflineCheckinsCount: newCheckinsCount,
              syncedAt: new Date().toISOString(),
            };
          }
          return ticket;
        });

        set({
          offlineTickets: newTickets,
          lastSyncedAt: new Date().toISOString(),
        });
      },

      clearOfflineTickets: () => {
        set({
          offlineTickets: [],
          lastSyncedAt: null,
        });
      },

      getOfflineTicketsNeedingSync: () => {
        return get().offlineTickets.filter((ticket) => {
          // Check if there are new checkins that haven't been synced
          const checkinCountDifference =
            (ticket.checkins?.length ?? 0) - ticket.lastOfflineCheckinsCount;
          return checkinCountDifference > 0;
        });
      },
    }),
    {
      name: 'ticketeria-tickets',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    }
  )
);
