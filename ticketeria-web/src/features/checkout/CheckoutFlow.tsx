import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '@shared/stores/cartStore';
import { useAuth } from '@shared/hooks/useAuth';
import { useToastStore } from '@shared/stores/toastStore';
import { api } from '@shared/lib/api';
import {
  Aurora,
  PpHeader,
  PButton,
  PBadge,
} from '@/design-system';
import styles from './CheckoutFlow.module.css';

interface HolderInfo {
  name: string;
  cpf: string;
  email: string;
  phone: string;
}

interface PixData {
  pixCode: string;
  amount: number;
  expiresAt: string;
  orderId: string;
}

const CheckoutFlow: React.FC = () => {
  const { user } = useAuth();
  const { items, getTotal, clear } = useCartStore();
  const addToast = useToastStore((s) => s.addToast);
  const navigate = useNavigate();

  const SESSION_DURATION = 10 * 60 * 1000;
  const expiresAtRef = useRef<number>(Date.now() + SESSION_DURATION);
  const [timeLeft, setTimeLeft] = useState<number>(SESSION_DURATION);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [holders, setHolders] = useState<HolderInfo[]>(() => {
    const totalQty = items.reduce((acc, it) => acc + it.quantity, 0);
    return Array.from({ length: Math.max(1, totalQty) }, () => ({
      name: user?.name ?? '',
      cpf: user?.cpf ?? '',
      email: user?.email ?? '',
      phone: '',
    }));
  });
  const [pix, setPix] = useState<PixData | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = expiresAtRef.current - Date.now();
      if (remaining <= 0) {
        clearInterval(interval);
        setTimeLeft(0);
        addToast({ type: 'error', message: 'Reserva expirou. Volte e tente novamente.' });
        navigate(-1);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [navigate, addToast]);

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const total = getTotal();
  const firstItem = items[0];

  const handleHolderChange = (idx: number, field: keyof HolderInfo, value: string) => {
    setHolders((prev) =>
      prev.map((h, i) => (i === idx ? { ...h, [field]: value } : h)),
    );
  };

  const validateHolders = (): boolean => {
    for (const h of holders) {
      if (!h.name.trim() || !h.cpf.trim() || !h.email.trim()) return false;
    }
    return true;
  };

  const handleCheckout = async () => {
    if (!validateHolders()) {
      addToast({ type: 'error', message: 'Preencha nome, CPF e e-mail de todos os ingressos.' });
      return;
    }
    if (!firstItem) {
      addToast({ type: 'error', message: 'Carrinho vazio.' });
      return;
    }
    setSubmitting(true);
    try {
      const idempotencyKey = (window.crypto as { randomUUID?: () => string }).randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
      const r = await api.post(
        '/v1/payments/checkout',
        {
          eventId: firstItem.eventId,
          batches: items.map((it) => ({
            batchId: it.batchId,
            quantity: it.quantity,
            holders: holders.slice(0, it.quantity).map((h) => ({
              name: h.name,
              cpf: h.cpf.replace(/\D/g, ''),
              email: h.email,
            })),
          })),
          paymentMethod: 'pix',
          idempotencyKey,
        },
      );
      const data = (r.data ?? r) as { paymentInfo?: { pixCopyPaste?: string; expiresAt?: string }; order?: { id: string; totalCents: number } };
      setPix({
        pixCode: data.paymentInfo?.pixCopyPaste ?? '',
        amount: (data.order?.totalCents ?? total * 100) / 100,
        expiresAt: data.paymentInfo?.expiresAt ?? new Date(Date.now() + 5 * 60_000).toISOString(),
        orderId: data.order?.id ?? '',
      });
      setStep(3);
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Não foi possível processar o checkout.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const copyPix = () => {
    if (!pix?.pixCode) return;
    navigator.clipboard.writeText(pix.pixCode).then(() => {
      addToast({ type: 'success', message: 'Código PIX copiado!' });
    });
  };

  if (items.length === 0 && !pix) {
    return (
      <Aurora style={{ minHeight: '100vh' }} intensity={0.5}>
        <PpHeader user={user ? { name: user.name } : null} />
        <main className={styles.emptyMain}>
          <h1 className={styles.emptyTitle}>Carrinho vazio</h1>
          <p className={styles.emptyBody}>
            Você não tem nenhum ingresso reservado.
          </p>
          <PButton variant="primary" size="lg" onClick={() => navigate('/')}>
            Descobrir eventos
          </PButton>
        </main>
      </Aurora>
    );
  }

  return (
    <Aurora style={{ minHeight: '100vh' }} intensity={0.6}>
      <PpHeader user={user ? { name: user.name } : null} />

      <main className={styles.main}>
        {/* Top bar: timer + secure badge */}
        <div className={styles.topBar}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => (step === 3 ? navigate('/tickets') : step === 1 ? navigate(-1) : setStep((s) => (s - 1) as 1 | 2))}
            aria-label="Voltar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <div className={styles.topBarTitle}>
            Pagamento · <span className={styles.stepNumber}>{step}</span> de 3
          </div>
          <PBadge tone="pulse">Seguro</PBadge>
        </div>

        {/* Stepper */}
        <div className={styles.stepper}>
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`${styles.stepBar} ${s <= step ? styles.stepBarActive : ''}`}
            />
          ))}
        </div>

        {/* Step content */}
        {step !== 3 ? (
          <div className={styles.formArea}>
            <div className={styles.eyebrow}>
              Tempo restante <span className={styles.timer}>{formatTime(timeLeft)}</span>
            </div>
            <h1 className={styles.title}>
              {step === 1 ? 'Dados dos ingressos' : 'Revisar pedido'}
            </h1>
            <p className={styles.subtitle}>
              {step === 1
                ? 'Cada ingresso precisa de um titular com CPF. Pode ser você ou amigos.'
                : 'Confirme tudo antes de gerar o PIX.'}
            </p>

            {step === 1 && (
              <div className={styles.holdersList}>
                {holders.map((h, idx) => (
                  <div key={idx} className={styles.holderCard}>
                    <div className={styles.holderHeader}>
                      <span className={styles.holderNumber}>#{idx + 1}</span>
                      <span className={styles.holderLabel}>Titular</span>
                    </div>
                    <div className={styles.fieldRow}>
                      <Field
                        label="Nome completo"
                        value={h.name}
                        onChange={(v) => handleHolderChange(idx, 'name', v)}
                      />
                      <Field
                        label="CPF"
                        placeholder="000.000.000-00"
                        value={h.cpf}
                        onChange={(v) => handleHolderChange(idx, 'cpf', v)}
                      />
                    </div>
                    <div className={styles.fieldRow}>
                      <Field
                        label="E-mail"
                        type="email"
                        value={h.email}
                        onChange={(v) => handleHolderChange(idx, 'email', v)}
                      />
                      <Field
                        label="WhatsApp"
                        placeholder="(11) 9 9999-0000"
                        value={h.phone}
                        onChange={(v) => handleHolderChange(idx, 'phone', v)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className={styles.summaryBox}>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>{items.length} ingresso(s)</span>
                  <span className={styles.summaryValue}>R$ {total.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Taxa de serviço</span>
                  <span className={styles.summaryValue}>R$ 0,00</span>
                </div>
                <div className={styles.summaryDivider} />
                <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                  <span>Total</span>
                  <span className={styles.totalValue}>R$ {total.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>
            )}

            <div className={styles.actions}>
              <PButton
                variant="primary"
                size="lg"
                full
                loading={submitting}
                onClick={() => (step === 1 ? setStep(2) : handleCheckout())}
                iconRight={
                  !submitting && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  )
                }
              >
                {step === 1 ? 'Revisar pedido' : submitting ? 'Gerando PIX…' : 'Gerar PIX'}
              </PButton>
            </div>
          </div>
        ) : pix ? (
          <PixSuccess pix={pix} timeLeft={timeLeft} formatTime={formatTime} onCopy={copyPix} onClear={clear} />
        ) : null}
      </main>
    </Aurora>
  );
};

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}> = ({ label, value, onChange, type = 'text', placeholder }) => (
  <div className={styles.field}>
    <div className={styles.fieldLabel}>{label}</div>
    <div className={styles.fieldInputWrap}>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={styles.fieldInput}
      />
    </div>
  </div>
);

const PixSuccess: React.FC<{
  pix: { pixCode: string; amount: number; expiresAt: string; orderId: string };
  timeLeft: number;
  formatTime: (ms: number) => string;
  onCopy: () => void;
  onClear: () => void;
}> = ({ pix, timeLeft, formatTime, onCopy, onClear }) => {
  // Simulação visual de QR — pixels deterministicos
  const cells = React.useMemo(() => {
    return Array.from({ length: 21 * 21 }, (_, i) => {
      const x = i % 21,
        y = Math.floor(i / 21);
      const isFinder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
      const seed = (x * 73 + y * 31) % 100;
      return isFinder ? 'finder' : seed > 52 ? 'on' : 'off';
    });
  }, []);

  React.useEffect(() => () => onClear(), [onClear]);

  return (
    <div className={styles.pixArea}>
      <div className={styles.eyebrow}>
        Aguardando pagamento{' '}
        <span className={styles.timerCountdown}>{formatTime(timeLeft)}</span>
      </div>
      <h1 className={styles.title}>
        Pague com Pix{' '}
        <span className={styles.titleAccent}>e seu ingresso é seu.</span>
      </h1>

      <div className={styles.qrWrap}>
        <div className={styles.qrPanel}>
          <div className={styles.qrGrid}>
            {cells.map((c, i) => {
              const x = i % 21,
                y = Math.floor(i / 21);
              const inFinder =
                (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
              let fill = 'transparent';
              if (inFinder) {
                const fx = x < 7 ? x : x - 14;
                const fy = y < 7 ? y : y - 14;
                const ring = fx === 0 || fx === 6 || fy === 0 || fy === 6;
                const center = fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4;
                if (ring || center) fill = '#06070A';
              } else if (c === 'on') {
                fill = '#06070A';
              }
              return <div key={i} style={{ background: fill, borderRadius: 1 }} />;
            })}
          </div>
          <div className={styles.qrCenter}>pix</div>
        </div>
      </div>

      <div className={styles.pixCode}>
        <div className={styles.pixCodeText}>{pix.pixCode || 'Aguardando código…'}</div>
        <PButton variant="primary" size="sm" onClick={onCopy}>
          Copiar
        </PButton>
      </div>

      <div className={styles.summaryAfter}>
        <div className={styles.summaryAfterRow}>
          <div>
            <div className={styles.summaryAfterLabel}>Total</div>
            <div className={styles.summaryAfterValue}>
              R$ {pix.amount.toFixed(2).replace('.', ',')}
            </div>
          </div>
          <PBadge tone="pulse" dot>
            Aguardando confirmação
          </PBadge>
        </div>
      </div>

      <div className={styles.helper}>
        A confirmação chega aqui em{' '}
        <span className={styles.helperBold}>até 30 segundos</span>. Você pode fechar o app.
      </div>
    </div>
  );
};

export default CheckoutFlow;
