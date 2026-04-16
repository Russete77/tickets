import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Button } from '@shared/ui/Button/Button';
import { useToastStore } from '@shared/stores/toastStore';
import styles from './PixQR.module.css';

interface PixQRProps {
  pixCode: string;
  amount: number;
  expiresAt: string;
}

const PixQR: React.FC<PixQRProps> = ({ pixCode, amount, expiresAt }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const addToast = useToastStore((s) => s.addToast);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, pixCode, {
        width: 240,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
      });
    }
  }, [pixCode]);

  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setTimeLeft(diff);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isExpired = timeLeft === 0;
  const isUrgent = timeLeft > 0 && timeLeft <= 60;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pixCode);
      addToast({ type: 'success', message: 'Código PIX copiado!' });
    } catch {
      addToast({ type: 'error', message: 'Não foi possível copiar o código' });
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.pixLogo}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M16 0C7.163 0 0 7.163 0 16s7.163 16 16 16 16-7.163 16-16S24.837 0 16 0z" fill="#32BCAD"/>
            <path d="M20.5 11.5L16 7l-4.5 4.5 4.5 4.5 4.5-4.5zM11.5 20.5L16 25l4.5-4.5L16 16l-4.5 4.5zM7 15.5L11.5 11 16 15.5l-4.5 4.5L7 15.5zM25 15.5L20.5 11 16 15.5l4.5 4.5L25 15.5z" fill="white"/>
          </svg>
          <span className={styles.pixLabel}>Pague com PIX</span>
        </div>
        <div className={`${styles.timer} ${isUrgent ? styles.timerUrgent : ''} ${isExpired ? styles.timerExpired : ''}`}>
          {isExpired ? (
            <span>Expirado</span>
          ) : (
            <span>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
          )}
        </div>
      </div>

      {isExpired ? (
        <div className={styles.expired}>
          <p>O código PIX expirou. Gere um novo pedido.</p>
        </div>
      ) : (
        <>
          <div className={styles.qrWrapper}>
            <canvas ref={canvasRef} className={styles.qrCanvas} />
          </div>

          <p className={styles.instruction}>
            Escaneie o QR Code com o app do seu banco
          </p>

          <div className={styles.codeSection}>
            <p className={styles.codeLabel}>Ou copie o código PIX:</p>
            <div className={styles.codeBox}>
              <code className={styles.code}>{pixCode.slice(0, 40)}...</code>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                Copiar
              </Button>
            </div>
          </div>

          <div className={styles.amount}>
            <span className={styles.amountLabel}>Valor</span>
            <span className={styles.amountValue}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)}
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default PixQR;
