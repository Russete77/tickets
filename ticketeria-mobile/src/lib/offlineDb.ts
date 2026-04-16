import * as SQLite from 'expo-sqlite';
import { authenticator } from 'otplib';

const DB_NAME = 'pulsepass_offline.db';

export interface OfflineTicket {
  id: string;
  eventId: string;
  eventName: string;
  ticketHash: string;
  totpSecret: string;
  holderName: string;
  holderEmail: string;
  holderCpf: string;
  batchName: string;
  status: string;        // 'active' | 'used'
  checkedInAt: string | null;
  syncedToServer: number; // 0 or 1
  cachedAt: string;
}

export interface PendingCheckin {
  id: number;
  ticketId: string;
  eventId: string;
  ticketHash: string;
  checkedInAt: string;
  operatorId: string;
  deviceId: string;
  synced: number; // 0 or 1
}

let db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await initSchema(db);
  }
  return db;
}

async function initSchema(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS offline_tickets (
      id TEXT PRIMARY KEY,
      eventId TEXT NOT NULL,
      eventName TEXT NOT NULL,
      ticketHash TEXT NOT NULL UNIQUE,
      totpSecret TEXT NOT NULL,
      holderName TEXT NOT NULL,
      holderEmail TEXT,
      holderCpf TEXT,
      batchName TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      checkedInAt TEXT,
      syncedToServer INTEGER NOT NULL DEFAULT 0,
      cachedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pending_checkins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticketId TEXT NOT NULL,
      eventId TEXT NOT NULL,
      ticketHash TEXT NOT NULL,
      checkedInAt TEXT NOT NULL,
      operatorId TEXT NOT NULL,
      deviceId TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_tickets_event ON offline_tickets(eventId);
    CREATE INDEX IF NOT EXISTS idx_tickets_hash ON offline_tickets(ticketHash);
    CREATE INDEX IF NOT EXISTS idx_pending_synced ON pending_checkins(synced);
  `);
}

// ============================================
// Ticket Caching (download for offline use)
// ============================================

export async function cacheTicketsForEvent(
  eventId: string,
  eventName: string,
  tickets: Array<{
    id: string;
    ticketHash: string;
    totpSecret: string;
    holderName: string;
    holderEmail: string;
    holderCpf: string;
    batchName: string;
    status: string;
  }>,
): Promise<number> {
  const database = await getDb();
  let cached = 0;

  for (const ticket of tickets) {
    await database.runAsync(
      `INSERT OR REPLACE INTO offline_tickets
       (id, eventId, eventName, ticketHash, totpSecret, holderName, holderEmail, holderCpf, batchName, status, cachedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ticket.id, eventId, eventName, ticket.ticketHash, ticket.totpSecret,
      ticket.holderName, ticket.holderEmail, ticket.holderCpf, ticket.batchName,
      ticket.status, new Date().toISOString(),
    );
    cached++;
  }

  return cached;
}

// ============================================
// Offline Check-in Validation
// ============================================

export async function validateOfflineCheckin(
  ticketHash: string,
  totpCode: string,
  eventId: string,
  operatorId: string,
  deviceId: string,
): Promise<{ success: boolean; result: string; message: string; ticket?: OfflineTicket }> {
  const database = await getDb();

  // 1. Find ticket by hash
  const ticket = await database.getFirstAsync<OfflineTicket>(
    'SELECT * FROM offline_tickets WHERE ticketHash = ?',
    ticketHash,
  );

  if (!ticket) {
    return { success: false, result: 'invalid_hash', message: 'Ingresso nao encontrado (offline)' };
  }

  // 2. Check event
  if (ticket.eventId !== eventId) {
    return { success: false, result: 'wrong_event', message: 'Ingresso e para outro evento' };
  }

  // 3. Check status
  if (ticket.status === 'used') {
    return { success: false, result: 'already_used', message: 'Ingresso ja foi utilizado' };
  }

  if (ticket.status !== 'active') {
    return { success: false, result: 'ticket_cancelled', message: `Ingresso ${ticket.status}` };
  }

  // 4. Verify TOTP
  authenticator.options = { window: 1, step: 30 };
  const totpValid = authenticator.check(totpCode, ticket.totpSecret);
  if (!totpValid) {
    return { success: false, result: 'invalid_totp', message: 'Codigo TOTP invalido' };
  }

  // 5. Mark as used locally
  const now = new Date().toISOString();
  await database.runAsync(
    'UPDATE offline_tickets SET status = ?, checkedInAt = ? WHERE id = ?',
    'used', now, ticket.id,
  );

  // 6. Queue for sync
  await database.runAsync(
    `INSERT INTO pending_checkins (ticketId, eventId, ticketHash, checkedInAt, operatorId, deviceId)
     VALUES (?, ?, ?, ?, ?, ?)`,
    ticket.id, eventId, ticketHash, now, operatorId, deviceId,
  );

  return {
    success: true,
    result: 'offline_valid',
    message: 'Check-in realizado (offline)',
    ticket: { ...ticket, status: 'used', checkedInAt: now },
  };
}

// ============================================
// Sync Queue
// ============================================

export async function getPendingCheckins(): Promise<PendingCheckin[]> {
  const database = await getDb();
  return database.getAllAsync<PendingCheckin>(
    'SELECT * FROM pending_checkins WHERE synced = 0 ORDER BY checkedInAt ASC',
  );
}

export async function markCheckinSynced(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync('UPDATE pending_checkins SET synced = 1 WHERE id = ?', id);
}

export async function getOfflineStats(eventId: string): Promise<{
  totalCached: number;
  checkedIn: number;
  pendingSync: number;
}> {
  const database = await getDb();

  const totalCached = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM offline_tickets WHERE eventId = ?', eventId,
  );
  const checkedIn = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM offline_tickets WHERE eventId = ? AND status = ?', eventId, 'used',
  );
  const pendingSync = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM pending_checkins WHERE eventId = ? AND synced = 0', eventId,
  );

  return {
    totalCached: totalCached?.count || 0,
    checkedIn: checkedIn?.count || 0,
    pendingSync: pendingSync?.count || 0,
  };
}

// ============================================
// Cleanup
// ============================================

export async function clearEventData(eventId: string): Promise<void> {
  const database = await getDb();
  await database.runAsync('DELETE FROM offline_tickets WHERE eventId = ?', eventId);
  await database.runAsync('DELETE FROM pending_checkins WHERE eventId = ? AND synced = 1', eventId);
}

export async function clearAllOfflineData(): Promise<void> {
  const database = await getDb();
  await database.runAsync('DELETE FROM offline_tickets');
  await database.runAsync('DELETE FROM pending_checkins WHERE synced = 1');
}
