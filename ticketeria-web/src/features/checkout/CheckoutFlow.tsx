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

  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [holderInfo, setHolderInfo] = useState<HolderInfo>({
    name: user?.name ?? '',
    cpf: '',
    email: user?.email ?? '',
    phone: '',
  });

  if (items.length === 0 && !pixData) {
    return (
      <PublicLayout>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
          </div>
          <h2>Seu carrinho está vazio</h2>
          <p>Adicione ingressos para continuar com o checkout</p>
          <Button variant="primary" onClick={() => navigate('/')}>
            Explorar eventos
          </Button>
        </div>
      </PublicLayout>
    );
  }

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
        setCouponApplied(false);
      } else {
        setCouponDiscount(response.data!.discount);
        setCouponApplied(true);
        addToast({ type: 'success', message: 'Cupom aplicado com sucesso!' });
      }
    } catch {
      addToast({ type: 'error', message: 'Erro ao validar cupom' });
    } finally {
      setCouponLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!holderInfo.name.trim() || !holderInfo.cpf.trim() || !holderInfo.email.trim()) {
      addToast({ type: 'error', message: 'Preencha todos os dados do titular' });
      return;
    }
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

  if (pixData) {
    return (
      <PublicLayout>
        <div className={styles.pixPage}>
          <div className={styles.pixCard}>
            <div className={styles.pixHeader}>
              <div className={styles.pixIconWrap}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="var(--tl-brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 className={styles.pixTitle}>Pague com PIX</h2>
              <p className={styles.pixSubtitle}>Escaneie o QR Code com seu app do banco</p>
            </div>
            <PixQR
              pixCode={pixData.pixCode}
              amount={pixData.amount}
              expiresAt={pixData.expiresAt}
            />
            <p className={styles.pixNote}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Após o pagamento, seus ingressos serão enviados para <strong>{holderInfo.email}</strong>
            </p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className={styles.page}>
        {/* Timer banner */}
        <div className={`${styles.timer} ${timerClass}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>Sua reserva expira em <strong>{formatTime(timeLeft)}</strong></span>
        </div>

        <div className={styles.layout}>
          {/* ── LEFT / MAIN ── */}
          <div className={styles.main}>
            {/* Section 1 — Titular */}
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionNum}>1</div>
                <h2 className={styles.sectionTitle}>Dados do titular</h2>
              </div>
              <div className={styles.holderGrid}>
                <div className={styles.fieldFull}>
                  <label className={styles.label}>Nome completo</label>
                  <Input
                    type="text"
                    value={holderInfo.name}
                    onChange={(e) => setHolderInfo((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Nome como no documento"
                  />
                </div>
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
                <div className={styles.fieldFull}>
                  <label className={styles.label}>E-mail</label>
                  <Input
                    type="email"
                    value={holderInfo.email}
                    onChange={(e) => setHolderInfo((p) => ({ ...p, email: e.target.value }))}
                    placeholder="seu@email.com"
                  />
                </div>
              </div>
            </section>

            {/* Section 2 — Cupom */}
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionNum}>2</div>
                <h2 className={styles.sectionTitle}>Cupom de desconto</h2>
              </div>
              <div className={styles.couponRow}>
                <Input
                  type="text"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    setCouponApplied(false);
                  }}
                  placeholder="Digite seu cupom (opcional)"
                />
                <Button
                  variant="outline"
                  onClick={applyCoupon}
                  loading={couponLoading}
                  disabled={couponApplied}
                >
                  {couponApplied ? 'Aplicado' : 'Aplicar'}
                </Button>
              </div>
              {couponApplied && couponDiscount > 0 && (
                <div className={styles.couponSuccess}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                  Desconto de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(couponDiscount)} aplicado!
                </div>
              )}
            </section>

            {/* Section 3 — Pagamento */}
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionNum}>3</div>
                <h2 className={styles.sectionTitle}>Forma de pagamento</h2>
              </div>
              <PaymentForm
                selectedMethod={paymentMethod}
                onMethodChange={setPaymentMethod}
              />
            </section>

            {/* Submit button */}
            <Button
              variant="primary"
              loading={loading}
              onClick={handlePlaceOrder}
              className={styles.submitBtn}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Finalizar Pedido
            </Button>
          </div>

          {/* ── RIGHT / SIDEBAR ── */}
          <aside className={styles.sidebar}>
            <OrderSummary couponDiscount={couponDiscount} />
          </aside>
        </div>
      </div>
    </PublicLayout>
  );
};

export default CheckoutFlow;
