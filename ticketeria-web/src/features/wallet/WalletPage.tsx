import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@shared/lib/api';
import { useTranslation } from '@shared/i18n';
import { useAuth } from '@shared/hooks/useAuth';
import { PpLayout, PButton, PBadge, GlassPanel } from '@/design-system';
import styles from './WalletPage.module.css';

interface Wallet {
  id: string;
  balanceCents: number;
  status?: string;
  eventId?: string;
}

interface Transaction {
  id: string;
  type: 'topup' | 'purchase' | 'refund' | 'recharge' | string;
  amountCents: number;
  description?: string;
  createdAt: string;
  pos?: { name?: string };
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const WalletPage: React.FC = () => {
  useTranslation();
  useAuth();
  const [_showRecharge, setShowRecharge] = useState(false);

  // Tenta resolver a wallet do user em algum evento ativo
  const { data: wallets = [], isLoading } = useQuery({
    queryKey: ['my-wallets'],
    queryFn: async () => {
      try {
        const r = await api.get<Wallet[]>('/v1/cashless/wallets/mine');
        return r.data ?? [];
      } catch {
        return [];
      }
    },
  });

  const wallet = wallets[0];

  const { data: transactions = [] } = useQuery({
    queryKey: ['wallet-transactions', wallet?.id],
    queryFn: async () => {
      if (!wallet?.id) return [];
      try {
        const r = await api.get<{ data?: Transaction[] }>(
          `/v1/cashless/wallets/${wallet.id}/transactions?limit=20`,
        );
        return Array.isArray(r.data) ? r.data : r.data?.data ?? [];
      } catch {
        return [];
      }
    },
    enabled: !!wallet?.id,
  });

  const balanceCents = wallet?.balanceCents ?? 0;
  const intPart = Math.floor(balanceCents / 100);
  const decPart = (balanceCents % 100).toString().padStart(2, '0');

  return (
    <PpLayout intensity={0.7}>
      <main className={styles.main}>
        {/* HEADER */}
        <header className={styles.header}>
          <div>
            <div className={styles.eyebrow}>Carteira PulsePass</div>
            <h1 className={styles.title}>
              Cashless{' '}
              <span className={styles.titleAccent}>digital.</span>
            </h1>
          </div>
        </header>

        {/* HERO BALANCE CARD */}
        <div className={styles.balanceCard}>
          <div className={styles.balanceGlow} />
          <div className={styles.balanceHeader}>
            <div className={styles.balanceLabel}>Saldo disponível</div>
            <div className={styles.balanceBars}>
              <span className={styles.barOn} />
              <span className={styles.barOff} />
            </div>
          </div>
          <div className={styles.balanceValue}>
            <span className={styles.balanceCurrency}>R$</span>
            <span className={styles.balanceInt}>{isLoading ? '—' : intPart.toLocaleString('pt-BR')}</span>
            <span className={styles.balanceDec}>,{decPart}</span>
          </div>
          {wallet?.status && (
            <div className={styles.balanceStatus}>
              <PBadge tone={wallet.status === 'wallet_active' ? 'pulse' : 'neutral'} dot={wallet.status === 'wallet_active'}>
                {wallet.status === 'wallet_active' ? 'Ativa' : wallet.status}
              </PBadge>
            </div>
          )}

          <div className={styles.actions}>
            <PButton variant="primary" size="lg" full onClick={() => setShowRecharge(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Recarregar
            </PButton>
            <PButton variant="glass" size="lg">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21 16-4 4-4-4M17 20V8M3 8l4-4 4 4M7 4v12" />
              </svg>
              Transferir
            </PButton>
            <PButton variant="glass" size="lg">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Sacar
            </PButton>
          </div>
        </div>

        {/* TRANSACTIONS */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Atividade</h2>
            <div className={styles.sectionDate}>Esta noite</div>
          </div>

          {transactions.length === 0 ? (
            <GlassPanel variant="medium" radius={18} padding={32} style={{ textAlign: 'center' }}>
              <div className={styles.emptyText}>Sem movimentações ainda.</div>
              <p className={styles.emptyHelp}>
                Recarregue sua carteira e use no bar via cashless.
              </p>
            </GlassPanel>
          ) : (
            <div className={styles.txList}>
              {transactions.map((tx) => {
                const isCredit = tx.type === 'topup' || tx.type === 'recharge' || tx.type === 'refund';
                const sign = isCredit ? '+' : '-';
                return (
                  <div key={tx.id} className={styles.txRow}>
                    <div
                      className={styles.txIcon}
                      style={{
                        background: isCredit ? 'rgba(0,255,133,0.15)' : 'rgba(255,255,255,0.06)',
                        border: isCredit ? '1px solid rgba(0,255,133,0.30)' : '1px solid var(--pp-edge-2)',
                      }}
                    >
                      <span className={styles.txEmoji}>
                        {tx.type === 'topup' || tx.type === 'recharge' ? '↑' : tx.type === 'refund' ? '↩' : '🍺'}
                      </span>
                    </div>
                    <div className={styles.txInfo}>
                      <div className={styles.txTitle}>{tx.description ?? capitalize(tx.type)}</div>
                      <div className={styles.txSub}>
                        {tx.pos?.name ?? '—'} · {formatTime(tx.createdAt)}
                      </div>
                    </div>
                    <div
                      className={styles.txAmount}
                      style={{ color: isCredit ? 'var(--pp-pulse)' : 'var(--pp-fg)' }}
                    >
                      {sign}
                      {formatBRL(tx.amountCents)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </PpLayout>
  );
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}

export default WalletPage;
