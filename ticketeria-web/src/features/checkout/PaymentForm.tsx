import React, { useState } from 'react';
import { Input } from '@shared/ui/Input/Input';
import styles from './PaymentForm.module.css';

export type PaymentMethod = 'pix' | 'credit_card' | 'boleto';

interface PaymentFormProps {
  onMethodChange: (method: PaymentMethod) => void;
  selectedMethod: PaymentMethod;
}

const formatCardNumber = (value: string) =>
  value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');

const formatExpiry = (value: string) =>
  value.replace(/\D/g, '').slice(0, 4).replace(/(\d{2})(\d)/, '$1/$2');

const PaymentForm: React.FC<PaymentFormProps> = ({ onMethodChange, selectedMethod }) => {
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [installments, setInstallments] = useState('1');

  const methods: { id: PaymentMethod; label: string; description: string }[] = [
    { id: 'pix', label: 'PIX', description: 'Aprovação imediata' },
    { id: 'credit_card', label: 'Cartão de crédito', description: 'Em até 12x' },
    { id: 'boleto', label: 'Boleto', description: 'Vence em 3 dias' },
  ];

  return (
    <div className={styles.container}>
      <h3 className={styles.sectionTitle}>Forma de pagamento</h3>

      <div className={styles.methods}>
        {methods.map((method) => (
          <button
            key={method.id}
            type="button"
            className={`${styles.methodCard} ${selectedMethod === method.id ? styles.methodSelected : ''}`}
            onClick={() => onMethodChange(method.id)}
          >
            <div className={styles.methodRadio}>
              {selectedMethod === method.id && <div className={styles.methodRadioDot} />}
            </div>
            <div className={styles.methodInfo}>
              <span className={styles.methodLabel}>{method.label}</span>
              <span className={styles.methodDesc}>{method.description}</span>
            </div>
            {method.id === 'pix' && (
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="16" fill="#32BCAD"/>
                <path d="M20.5 11.5L16 7l-4.5 4.5 4.5 4.5 4.5-4.5zM11.5 20.5L16 25l4.5-4.5L16 16l-4.5 4.5zM7 15.5L11.5 11 16 15.5l-4.5 4.5L7 15.5zM25 15.5L20.5 11 16 15.5l4.5 4.5L25 15.5z" fill="white"/>
              </svg>
            )}
            {method.id === 'credit_card' && (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                <line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
            )}
            {method.id === 'boleto' && (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="8" y1="13" x2="16" y2="13"/>
                <line x1="8" y1="17" x2="16" y2="17"/>
              </svg>
            )}
          </button>
        ))}
      </div>

      {selectedMethod === 'credit_card' && (
        <div className={styles.cardForm}>
          <div className={styles.field}>
            <label className={styles.label}>Número do cartão</label>
            <Input
              type="text"
              placeholder="0000 0000 0000 0000"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              inputMode="numeric"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Nome no cartão</label>
            <Input
              type="text"
              placeholder="Como está no cartão"
              value={cardName}
              onChange={(e) => setCardName(e.target.value.toUpperCase())}
              autoComplete="cc-name"
            />
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Validade</label>
              <Input
                type="text"
                placeholder="MM/AA"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                inputMode="numeric"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>CVV</label>
              <Input
                type="text"
                placeholder="000"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                inputMode="numeric"
              />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Parcelamento</label>
            <select
              className={styles.select}
              value={installments}
              onChange={(e) => setInstallments(e.target.value)}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}x {n === 1 ? 'sem juros' : 'com juros'}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {selectedMethod === 'pix' && (
        <div className={styles.pixInfo}>
          <p>O QR Code PIX será gerado após a confirmação do pedido.</p>
          <p>Você terá <strong>30 minutos</strong> para realizar o pagamento.</p>
        </div>
      )}

      {selectedMethod === 'boleto' && (
        <div className={styles.boletoInfo}>
          <p>O boleto será gerado após a confirmação do pedido.</p>
          <p>Vencimento em <strong>3 dias úteis</strong>. O ingresso é liberado após confirmação do pagamento.</p>
        </div>
      )}
    </div>
  );
};

export default PaymentForm;
