import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PublicLayout } from '@shared/layout/PublicLayout/PublicLayout';
import { api } from '@shared/lib/api';
import { Skeleton } from '@shared/ui/Skeleton/Skeleton';
import { useTranslation } from '@shared/i18n';
import styles from './WalletPage.module.css';

// ── Types ─────────────────────────────────────────
interface WalletBalance {
  balanceCents: number;
}

interface Transaction {
  id: string;
  type: 'recharge' | 'purchase' | 'refund';
  amountCents: number;
  description: string;
  createdAt: string;
}

interface RechargeResponse {
  pixQrCode: string;
  pixCopyPaste: string;
}

// ── Helpers ───────────────────────────────────────
function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const PRESET_AMOUNTS = [2000, 5000, 10000, 20000]; // centavos

// ── Recharge Modal ────────────────────────────────
interface RechargeModalProps {
  onClose: () => void;
}

const RechargeModal: React.FC<RechargeModalProps> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [pixData, setPixData] = useState<RechargeResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const amountCents = selectedAmount ?? (customAmount ? Math.round(parseFloat(customAmount.replace(',', '.')) * 100) : null);

  const { mutate: generatePix, isPending } = useMutation({
    mutationFn: async () => {
      if (!amountCents || amountCents <= 0) throw new Error('Valor inválido');
      const res = await api.post<RechargeResponse>('/v1/cashless/recharge', { amountCents });
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
    onSuccess: (data) => {
      setPixData(data);
      queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
    },
  });

  const handleCopy = async () => {
    if (!pixData) return;
    try {
      await navigator.clipboard.writeText(pixData.pixCopyPaste);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback silently
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className={styles.modalBackdrop} onClick={handleBackdropClick} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Recarregar Carteira</h2>
          <button className={styles.modalClose} onClick={onClose} aria-label="Fechar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {!pixData ? (
          <>
            <div className={styles.modalBody}>
              <p className={styles.amountLabel}>Escolha o valor</p>
              <div className={styles.amountGrid}>
                {PRESET_AMOUNTS.map((amount) => (
                  <button
                    key={amount}
                    className={`${styles.amountBtn} ${selectedAmount === amount ? styles.amountBtnActive : ''}`}
                    onClick={() => { setSelectedAmount(amount); setCustomAmount(''); }}
                  >
                    {formatCurrency(amount)}
                  </button>
                ))}
              </div>

              <div className={styles.customAmountWrapper}>
                <label className={styles.customLabel} htmlFor="custom-amount">Outro valor</label>
                <div className={styles.customInputWrapper}>
                  <span className={styles.currencyPrefix}>R$</span>
                  <input
                    id="custom-amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    className={styles.customInput}
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      setSelectedAmount(null);
                    }}
                  />
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.pixButton}
                disabled={!amountCents || amountCents <= 0 || isPending}
                onClick={() => generatePix()}
              >
                {isPending ? 'Gerando PIX...' : 'Gerar PIX'}
              </button>
            </div>
          </>
        ) : (
          <div className={styles.modalBody}>
            <div className={styles.pixSuccess}>
              <div className={styles.pixQrWrapper}>
                {/* QR code displayed as a styled placeholder (real QR via img tag) */}
                <img
                  src={pixData.pixQrCode}
                  alt="QR Code PIX"
                  className={styles.pixQrImage}
                  onError={(e) => {
                    // Fallback: show a placeholder QR if URL is not a real image
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className={styles.pixQrPlaceholder} aria-hidden="true">
                  <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <path d="M14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" fill="currentColor" stroke="none" />
                  </svg>
                  <p>QR Code PIX</p>
                </div>
              </div>

              <p className={styles.pixInstruction}>
                Escaneie o QR Code com o app do seu banco ou copie o código abaixo
              </p>

              <div className={styles.pixCodeWrapper}>
                <code className={styles.pixCode}>{pixData.pixCopyPaste}</code>
                <button className={`${styles.copyBtn} ${copied ? styles.copyBtnDone : ''}`} onClick={handleCopy}>
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>

              <p className={styles.pixNote}>
                Após o pagamento, o saldo será creditado automaticamente em sua carteira.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Transaction item ──────────────────────────────
const txTypeConfig = {
  recharge: { label: 'Recarga',  colorClass: 'txRecharge', sign: '+' },
  purchase: { label: 'Compra',   colorClass: 'txPurchase', sign: '-' },
  refund:   { label: 'Estorno',  colorClass: 'txRefund',   sign: '+' },
} as const;

const TransactionItem: React.FC<{ tx: Transaction }> = ({ tx }) => {
  const cfg = txTypeConfig[tx.type];
  return (
    <div className={styles.txItem}>
      <div className={`${styles.txIcon} ${styles[cfg.colorClass]}`}>
        {tx.type === 'recharge' && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
          </svg>
        )}
        {tx.type === 'purchase' && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
          </svg>
        )}
        {tx.type === 'refund' && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-4.5" />
          </svg>
        )}
      </div>
      <div className={styles.txInfo}>
        <p className={styles.txDescription}>{tx.description}</p>
        <p className={styles.txMeta}>
          <span className={`${styles.txTypeBadge} ${styles[cfg.colorClass + 'Badge']}`}>{cfg.label}</span>
          <span>{formatDate(tx.createdAt)}</span>
        </p>
      </div>
      <p className={`${styles.txAmount} ${styles[cfg.colorClass + 'Amount']}`}>
        {cfg.sign}{formatCurrency(tx.amountCents)}
      </p>
    </div>
  );
};

// ── Page ──────────────────────────────────────────
const WalletPage: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const { t } = useTranslation();

  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ['wallet-balance'],
    queryFn: async () => {
      const res = await api.get<WalletBalance>('/v1/cashless/balance');
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
  });

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ['wallet-transactions'],
    queryFn: async () => {
      const res = await api.get<Transaction[]>('/v1/cashless/transactions');
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
  });

  return (
    <PublicLayout>
      <div className={styles.page}>
        {/* ── Wallet header ── */}
        <div className={styles.walletHeader}>
          <div className={styles.walletCard}>
            <div className={styles.walletCardBg} aria-hidden="true" />
            <div className={styles.walletCardContent}>
              <p className={styles.balanceLabel}>{t('wallet.balance')}</p>
              {balanceLoading ? (
                <Skeleton width="180px" height="48px" borderRadius="8px" />
              ) : (
                <p className={styles.balanceValue}>
                  {formatCurrency(balanceData?.balanceCents ?? 0)}
                </p>
              )}
              <p className={styles.balanceNote}>Carteira Cashless · Tickety</p>
            </div>
            <button
              className={styles.rechargeBtn}
              onClick={() => setShowModal(true)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Recarregar
            </button>
          </div>
        </div>

        {/* ── Transaction history ── */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Histórico de Transações</h2>

          {txLoading ? (
            <div className={styles.txSkeleton}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} width="100%" height="68px" borderRadius="12px" />
              ))}
            </div>
          ) : !transactions || transactions.length === 0 ? (
            <div className={styles.emptyState}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
                <path d="M12 2a10 10 0 100 20A10 10 0 0012 2z" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p>Nenhuma transação encontrada.</p>
              <p className={styles.emptySubtext}>Recarregue sua carteira para começar a usar.</p>
            </div>
          ) : (
            <div className={styles.txList}>
              {transactions.map((tx) => (
                <TransactionItem key={tx.id} tx={tx} />
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && <RechargeModal onClose={()