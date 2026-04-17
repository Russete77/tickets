import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '@shared/stores/cartStore';
import { useAuth } from '@shared/hooks/useAuth';
import { useToastStore } from '@shared/stores/toastStore';
import { Button } from '@shared/ui/Button/Button';
import { Input } from '@shared/ui/Input/Input';
import { PublicLayout } from '@shared/layout/PublicLayout/PublicLayout';
import { api } from '@shared/lib/api';
import OrderSummary from './OrderSummary';
import PaymentForm, { PaymentMethod } from './PaymentForm';
import PixQR from './PixQR';
import styles from './CheckoutFlow.module.css';

type Step = 'holder' | 'coupon' | 'payment' | 'review' | 'pix';

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

const STEPS: { id: Step; label: string }[] = [
  { id: 'holder', label: 'Titular' },
  { id: 'coupon', label: 'Cupom' },
  { id: 'payment', label: 'Pagamento' },
  { id: 'review', label: 'Revisão' },
];

const CheckoutFlow: React.FC = () => {
  const { user } = useAuth();
  const { items, getTotal, clear } = useCartStore();
  const addToast = useToastStore((s) => s.addToast);
  const navigate = useNavigate();

  const SESSION_DURATION = 10 * 60 * 1000; // 10 minutes in ms
  const expiresAtRef = useRef<number>(Date.now() + SESSION_DURATION);
  const [timeLeft, setTimeLeft] = useState<number>(SESSION_DURATION);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = expiresAtRef.current - Date.now();
      if (remaining <= 0) {
        clearInterval(interval);
        setTimeLeft(0);
        alert('Tempo esgotado! Sua reserva expirou.');
        navigate(-1);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [navigate]);

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const timerClass =
    timeLeft < 60_000
      ? styles.timerCritical
      : timeLeft < 120_000
      ? styles.timerWarning
      : styles.timerNormal;

  const [step, setStep] = useState<Step>('holder');
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [holderInfo, setHolderInfo] = useState<HolderInfo>({
    name: user?.name ?? '',
    cpf: '',
    email: user?.email ?? '',
    phone: '',
  });

  if (items.length === 0 && step !== 'pix') {
    return (
      <PublicLayout>
        <div className={styles.empty}>
          <h2>Seu carrinho está vazio</h2>
          <Button variant="primary" onClick={() => navigate('/')}>
            Explorar eventos
          </Button>
        </div>
      </PublicLayout>
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const response = await api.post<{ discount: number }>('/v1/coupons/validate', {
        code: couponCode,
        subtotal: getTotal(),
      });
      if (response.error) {
        addToast({ type: 'error', message: 'Cupom inválido ou expirado' });
      } else {
        setCouponDiscount(response.data!.discount);
        addToast({ type: 'success', message: 'Cupom aplicado com sucesso!' });
      }
    } catch {
      addToast({ type: 'error', message: 'Erro ao validar cupom' });
    } finally {
      setCouponLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    try {
      const response = await api.post<PixData>('/v1/orders', {
        items: items.map((item) => ({ batchId: item.batchId, quantity: item.quantity })),
        holder: holderInfo,
        couponCode: couponCode || undefined,
        paymentMethod,
      });
      if (response.error) {
        addToast({ type: 'error', message: response.error });
        return;
      }
      if (paymentMethod === 'pix' && response.data) {
        setPixData(response.data);
        setStep('pix');
      } else {
        clear();
        addToast({ type: 'success', message: 'Pedido realizado com sucesso!' });
        navigate('/tickets');
      }
    } catch {
      addToast({ type: 'error', message: 'Erro ao finalizar pedido' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className={styles.page}>
        {step !== 'pix' && (
          <div className={styles.stepBar}>
            {STEPS.map((s, idx) => (
              <React.Fragment key={s.id}>
                <div className={`${styles.stepItem} ${idx <= stepIndex ? styles.stepActive : ''}`}>
                  <div className={styles.stepDot}>
                    {idx < stepIndex ? (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 7l4 4 6-6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </div>
                  <span className={styles.stepLabel}>{s.label}</span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`${styles.stepConnector} ${idx < stepIndex ? styles.stepConnectorDone : ''}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {step !== 'pix' && (
          <div className={`${styles.timer} ${timerClass}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Tempo restante: <strong>{formatTime(timeLeft)}</strong>
          </div>
        )}

        <div className={styles.content}>
          <div className={styles.mainArea}>
            {step === 'holder' && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Dados do titular</h2>
                <div className={styles.form}>
                  <div className={styles.field}>
                    <label className={styles.label}>Nome completo</label>
                    <Input
                      type="text"
                      value={holderInfo.name}
                      onChange={(e) => setHolderInfo((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Nome como no documento"
                    />
                  </div>
                  <div className={styles.row}>
                    <div className={styles.field}>
                      <label className={styles.label}>CPF</label>
                      <Input
                        type="text"
                        value={holderInfo.cpf}
                        onChange={(e) => setHolderInfo((p) => ({ ...p, cpf: e.target.value }))}
                        placeholder="000.000.000-00"
                        inputMode="numeric"
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Telefone</label>
                      <Input
                        type="tel"
                        value={holderInfo.phone}
                        onChange={(e) => setHolderInfo((p) => ({ ...p, phone: e.target.value }))}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>E-mail</label>
                    <Input
                      type="email"
                      value={holderInfo.email}
                      onChange={(e) => setHolderInfo((p) => ({ ...p, email: e.target.value }))}
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>
                <Button variant="primary" onClick={() => setStep('coupon')}>
                  Continuar
                </Button>
              </section>
            )}

            {step === 'coupon' && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Cupom de desconto</h2>
                <div className={styles.couponRow}>
                  <Input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Digite seu cupom"
                  />
                  <Button variant="outline" onClick={applyCoupon} loading={couponLoading}>
                    Aplicar
                  </Button>
                </div>
                {couponDiscount > 0 && (
                  <p className={styles.couponSuccess}>
                    Desconto de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(couponDiscount)} aplicado!
                  </p>
                )}
                <div className={styles.navButtons}>
                  <Button variant="ghost" onClick={() => setStep('holder')}>Voltar</Button>
                  <Button variant="primary" onClick={() => setStep('payment')}>Continuar</Button>
                </div>
              </section>
            )}

            {step === 'payment' && (
              <section className={styles.section}>
                <PaymentForm
                  selectedMethod={paymentMethod}
                  onMethodChange={setPaymentMethod}
                />
                <div className={styles.navButtons}>
                  <Button variant="ghost" onClick={() => setStep('coupon')}>Voltar</Button>
                  <Button variant="primary" onClick={() => setStep('review')}>Continuar</Button>
                </div>
              </section>
            )}

            {step === 'review' && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Revisão do pedido</h2>
                <div className={styles.reviewBlock}>
                  <h3 className={styles.reviewLabel}>Titular</h3>
                  <p className={styles.reviewValue}>{holderInfo.name}</p>
                  <p className={styles.reviewValue}>{holderInfo.email}</p>
                </div>
                <div className={styles.reviewBlock}>
                  <h3 className={styles.reviewLabel}>Pagamento</h3>
                  <p className={styles.reviewValue}>
                    {paymentMethod === 'pix' ? 'PIX' : paymentMethod === 'credit_card' ? 'Cartão de crédito' : 'Boleto'}
                  </p>
                </div>
                <div className={styles.navButtons}>
                  <Button variant="ghost" onClick={() => setStep('payment')}>Voltar</Button>
                  <Button variant="primary" loading={loading} onClick={handlePlaceOrder}>
                    Finalizar pedido
                  </Button>
                </div>
              </section>
            )}

            {step === 'pix' && pixData && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Pague com PIX</h2>
                <PixQR
                  pixCode={pixData.pixCode}
                  amount={pixData.amount}
                  expiresAt={pixData.expiresAt}
                />
                <p className={styles.pixNote}>
                  Após o pagamento, seus ingressos serão enviados para {holderInfo.email}
                </p>
              </section>
            )}
          </div>

          <div className={styles.sidebar}>
            <OrderSummary couponDiscount={couponDiscount} />
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default CheckoutFlow;
