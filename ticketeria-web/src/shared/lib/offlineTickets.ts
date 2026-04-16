/**
 * Offline Ticket Storage Utility
 * Uses IndexedDB to store ticket data and TOTP secrets for offline access
 */

export interface OfflineTicket {
  id: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  eventImage?: string;
  orderId: string;
  qrCode: string;
  barcode?: string;
  batchId: string;
  totalPrice: number;
  currency: string;
  // TOTP secret - should be encrypted before storage
  totpSecret: string;
  // User data
  firstName: string;
  lastName: string;
  email: string;
  // Metadata
  savedAt: number;
  usedAt?: number;
  syncedToServer: boolean;
}

const DB_NAME = 'ticketeria-db';
const DB_VERSION = 1;
const TICKETS_STORE = 'offline-tickets';
const SYNC_LOG_STORE = 'sync-log';

/**
 * Open IndexedDB connection
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create tickets store
      if (!db.objectStoreNames.contains(TICKETS_STORE)) {
        const ticketsStore = db.createObjectStore(TICKETS_STORE, {
          keyPath: 'id',
        });
        ticketsStore.createIndex('eventId', 'eventId');
        ticketsStore.createIndex('orderId', 'orderId');
        ticketsStore.createIndex('syncedToServer', 'syncedToServer');
        ticketsStore.createIndex('savedAt', 'savedAt');
      }

      // Create sync log store
      if (!db.objectStoreNames.contains(SYNC_LOG_STORE)) {
        db.createObjectStore(SYNC_LOG_STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });
      }
    };
  });
}

/**
 * Save a ticket for offline access
 */
export async function saveOfflineTicket(
  ticket: OfflineTicket
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TICKETS_STORE], 'readwrite');
    const store = transaction.objectStore(TICKETS_STORE);
    const request = store.put(ticket);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get a saved offline ticket by ID
 */
export async function getOfflineTicket(
  ticketId: string
): Promise<OfflineTicket | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TICKETS_STORE], 'readonly');
    const store = transaction.objectStore(TICKETS_STORE);
    const request = store.get(ticketId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Get all offline tickets
 */
export async function getAllOfflineTickets(): Promise<OfflineTicket[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TICKETS_STORE], 'readonly');
    const store = transaction.objectStore(TICKETS_STORE);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Get tickets for a specific event
 */
export async function getEventOfflineTickets(
  eventId: string
): Promise<OfflineTicket[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TICKETS_STORE], 'readonly');
    const store = transaction.objectStore(TICKETS_STORE);
    const index = store.index('eventId');
    const request = index.getAll(eventId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Get unsynchronized tickets (need to be synced to server)
 */
export async function getUnsyncedOfflineTickets(): Promise<OfflineTicket[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TICKETS_STORE], 'readonly');
    const store = transaction.objectStore(TICKETS_STORE);
    const index = store.index('syncedToServer');
    const request = index.getAll(IDBKeyRange.only(0));

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Mark ticket as used (checked in)
 */
export async function markTicketAsUsed(
  ticketId: string
): Promise<void> {
  const ticket = await getOfflineTicket(ticketId);
  if (!ticket) {
    throw new Error(`Ticket ${ticketId} not found`);
  }

  ticket.usedAt = Date.now();
  await saveOfflineTicket(ticket);
}

/**
 * Mark ticket as synced to server
 */
export async function markTicketAsSynced(
  ticketId: string
): Promise<void> {
  const ticket = await getOfflineTicket(ticketId);
  if (!ticket) {
    throw new Error(`Ticket ${ticketId} not found`);
  }

  ticket.syncedToServer = true;
  await saveOfflineTicket(ticket);
}

/**
 * Delete an offline ticket
 */
export async function deleteOfflineTicket(
  ticketId: string
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TICKETS_STORE], 'readwrite');
    const store = transaction.objectStore(TICKETS_STORE);
    const request = store.delete(ticketId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Delete all offline tickets
 */
export async function clearAllOfflineTickets(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TICKETS_STORE], 'readwrite');
    const store = transaction.objectStore(TICKETS_STORE);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Log a sync attempt
 */
export async function logSyncAttempt(
  ticketId: string,
  success: boolean,
  error?: string
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SYNC_LOG_STORE], 'readwrite');
    const store = transaction.objectStore(SYNC_LOG_STORE);
    const request = store.add({
      ticketId,
      success,
      error,
      timestamp: Date.now(),
    });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get sync status for display
 */
export async function getSyncStatus(): Promise<{
  totalTickets: number;
  syncedTickets: number;
  unsyncedTickets: number;
  usedTickets: number;
}> {
  const allTickets = await getAllOfflineTickets();
  const syncedTickets = allTickets.filter((t) => t.syncedToServer).length;
  const usedTickets = allTickets.filter((t) => t.usedAt).length;

  return {
    totalTickets: allTickets.length,
    syncedTickets,
    unsyncedTickets: allTickets.length - syncedTickets,
    usedTickets,
  };
}

/**
 * Export offline tickets as JSON (for backup)
 */
export async function exportOfflineTickets(): Promise<string> {
  const tickets = await getAllOfflineTickets();
  return JSON.stringify(tickets, null, 2);
}

/**
 * Import offline tickets from JSON
 */
export async function importOfflineTickets(
  jsonData: string
): Promise<number> {
  const tickets: OfflineTicket[] = JSON.parse(jsonData);
  let imported = 0;

  for (const ticket of tickets) {
    try {
      await saveOfflineTicket(ticket);
      imported++;
    } catch (error) {
      console.error(`Failed to import ticket ${ticket.id}:`, error);
    }
  }

  return imported;
}

/**
 * Clean up old tickets (older than 30 days)
 */
export async function cleanupOldOfflineTickets(
  daysOld: number = 30
): Promise<number> {
  const allTickets = await getAllOfflineTickets();
  const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;
  let deleted = 0;

  for (const ticket of allTickets) {
    if (ticket.savedAt < cutoffTime && ticket.usedAt) {
      await deleteOfflineTicket(ticket.id);
      deleted++;
    }
  }

  return deleted;
}

/**
 * Get storage quota usage
 */
export async function getStorageQuota(): Promise<{
  used: number;
  quota: number;
  percentage: number;
}> {
  if (!navigator.storage || !navigator.storage.estimate) {
    return { used: 0, quota: 0, percentage: 0 };
  }

  const estimate = await navigator.storage.estimate();
  const used = estimate.usage || 0;
  const quota = estimate.quota || 0;
  const percentage = quota > 0 ? Math.round((used / quota) * 100) : 0;

  return { used, quota, percentage };
}
