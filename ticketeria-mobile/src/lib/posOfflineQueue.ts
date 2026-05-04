/**
 * SQLite offline queue para POS — modo offline robusto.
 *
 * Cada operação (charge/topup/refund) é salva localmente com client_tx_id único.
 * Sync automático tenta replay quando NetInfo detecta conexão.
 * Conflict resolution: last-write-wins por wallet, exceto saldo negativo (failed_conflict).
 *
 * Auditoria CTO 2026-05 — gap 4.4 (offline POS)
 */
import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import NetInfo from '@react-native-community/netinfo';

interface PendingTx {
  client_tx_id: string;
  type: 'charge' | 'topup' | 'refund';
  wallet_id?: string | null;
  wallet_uid?: string | null;
  amount_cents: number;
  tip_cents: number;
  items_json: string;
  pos_id: string;
  operator_id: string;
  created_at_ts: number;
  attempts: number;
  last_error: string | null;
  status: 'pending' | 'synced' | 'failed_conflict';
}

const DB_NAME = 'pulsepass_pos_v1.db';
let _db: SQLite.SQLiteDatabase | null = null;

async function db(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync(DB_NAME);
  await _db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS pending_tx (
      client_tx_id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      wallet_id TEXT,
      wallet_uid TEXT,
      amount_cents INTEGER NOT NULL,
      tip_cents INTEGER NOT NULL DEFAULT 0,
      items_json TEXT,
      pos_id TEXT NOT NULL,
      operator_id TEXT NOT NULL,
      created_at_ts INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      status TEXT NOT NULL DEFAULT 'pending'
    );
    CREATE INDEX IF NOT EXISTS idx_pending_status ON pending_tx(status, created_at_ts);
  `);
  return _db;
}

/** Adiciona transação pendente. Retorna client_tx_id. */
export async function enqueue(args: {
  type: PendingTx['type'];
  walletId?: string;
  walletUid?: string;
  amountCents: number;
  tipCents?: number;
  items?: unknown;
  posId: string;
  operatorId: string;
}): Promise<string> {
  const d = await db();
  const clientTxId = Crypto.randomUUID();
  await d.runAsync(
    `INSERT INTO pending_tx (client_tx_id, type, wallet_id, wallet_uid, amount_cents, tip_cents, items_json, pos_id, operator_id, created_at_ts)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      clientTxId,
      args.type,
      args.walletId ?? null,
      args.walletUid ?? null,
      args.amountCents,
      args.tipCents ?? 0,
      JSON.stringify(args.items ?? []),
      args.posId,
      args.operatorId,
      Date.now(),
    ],
  );
  return clientTxId;
}

export async function listPending(): Promise<PendingTx[]> {
  const d = await db();
  return (await d.getAllAsync<PendingTx>(
    `SELECT * FROM pending_tx WHERE status = 'pending' ORDER BY created_at_ts ASC`,
  )) ?? [];
}

export async function listConflicts(): Promise<PendingTx[]> {
  const d = await db();
  return (await d.getAllAsync<PendingTx>(
    `SELECT * FROM pending_tx WHERE status = 'failed_conflict' ORDER BY created_at_ts ASC`,
  )) ?? [];
}

export async function markSynced(clientTxId: string): Promise<void> {
  const d = await db();
  await d.runAsync(
    `UPDATE pending_tx SET status = 'synced' WHERE client_tx_id = ?`,
    [clientTxId],
  );
}

export async function markConflict(clientTxId: string, error: string): Promise<void> {
  const d = await db();
  await d.runAsync(
    `UPDATE pending_tx SET status = 'failed_conflict', last_error = ? WHERE client_tx_id = ?`,
    [error, clientTxId],
  );
}

export async function bumpAttempt(clientTxId: string, error: string): Promise<void> {
  const d = await db();
  await d.runAsync(
    `UPDATE pending_tx SET attempts = attempts + 1, last_error = ? WHERE client_tx_id = ?`,
    [error, clientTxId],
  );
}

/**
 * Tenta sincronizar todas as pendentes com a API.
 * Idempotente — usa client_tx_id como X-Idempotency-Key.
 */
export async function syncAll(args: {
  apiBaseUrl: string;
  jwt: string;
}): Promise<{ synced: number; conflicts: number; remaining: number }> {
  const pending = await listPending();
  let synced = 0;
  let conflicts = 0;

  for (const tx of pending) {
    if (tx.attempts >= 8) {
      await markConflict(tx.client_tx_id, tx.last_error ?? 'too many attempts');
      conflicts++;
      continue;
    }
    try {
      const path =
        tx.type === 'charge'
          ? `/cashless/wallet/${tx.wallet_id}/charge`
          : tx.type === 'topup'
            ? `/cashless/wallet/${tx.wallet_id}/topup`
            : `/cashless/transaction/${tx.client_tx_id}/reverse`;

      const res = await fetch(`${args.apiBaseUrl}/v1${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${args.jwt}`,
          'X-Idempotency-Key': tx.client_tx_id,
        },
        body: JSON.stringify({
          amountCents: tx.amount_cents,
          tipCents: tx.tip_cents,
          items: JSON.parse(tx.items_json || '[]'),
          posId: tx.pos_id,
          operatorId: tx.operator_id,
          clientTxId: tx.client_tx_id,
          createdAtTs: tx.created_at_ts,
        }),
      });

      if (res.ok) {
        await markSynced(tx.client_tx_id);
        synced++;
      } else if (res.status === 409 || res.status === 400) {
        // Conflict (saldo insuficiente quando aplicado em ordem cronológica)
        await markConflict(tx.client_tx_id, `${res.status}: ${await res.text()}`);
        conflicts++;
      } else {
        await bumpAttempt(tx.client_tx_id, `HTTP ${res.status}`);
      }
    } catch (err) {
      await bumpAttempt(tx.client_tx_id, err instanceof Error ? err.message : 'network');
    }
  }

  const remaining = (await listPending()).length;
  return { synced, conflicts, remaining };
}

/**
 * Inicia listener de NetInfo — chama syncAll quando online.
 */
export function startAutoSync(args: { apiBaseUrl: string; getJwt: () => string | null }): () => void {
  return NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) {
      const jwt = args.getJwt();
      if (jwt) {
        void syncAll({ apiBaseUrl: args.apiBaseUrl, jwt });
      }
    }
  });
}

/** Métricas pra mostrar no header do app POS. */
export async function getOfflineMetrics(): Promise<{
  pending: number;
  conflicts: number;
  oldestPendingMs: number | null;
}> {
  const d = await db();
  const pending = (await d.getFirstAsync<{ c: number; oldest: number | null }>(
    `SELECT COUNT(*) as c, MIN(created_at_ts) as oldest FROM pending_tx WHERE status = 'pending'`,
  )) ?? { c: 0, oldest: null };
  const conflicts = (await d.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM pending_tx WHERE status = 'failed_conflict'`,
  )) ?? { c: 0 };
  return {
    pending: pending.c,
    conflicts: conflicts.c,
    oldestPendingMs: pending.oldest ? Date.now() - pending.oldest : null,
  };
}
