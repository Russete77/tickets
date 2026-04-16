import React, { useEffect, useRef, useState, useCallback } from 'react';
import QRCode from 'qrcode';
import { Spinner } from '@shared/ui/Spinner/Spinner';
import styles from './TicketQR.module.css';

interface TicketQRProps {
  ticketId: string;
  totpSecret: string;
}

const REFRESH_INTERVAL = 30;

const TicketQR: React.FC<TicketQRProps> = ({ ticketId, totpSecret }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [timeLeft, setTimeLeft] = useState(REFRESH_INTERVAL);
  const [generating, setGenerating] = useState(true);

  const generateQR = useCallback(async () => {
    setGenerating(true);
    try {
      const timestamp = Math.floor(Date.now() / (REFRESH_INTERVAL * 1000));
      const payload = `${ticketId}:${totpSecret}:${timestamp}`;
      if (canvasRef.current) {
        await QRCode.toCanvas(canvasRef.current, payload, {
          width: 240,
          margin: 2,
          color: { dark: '#000000', light: '#FFFFFF' },
        });
      }
    } finally {
      setGenerating(false);
    }
  }, [ticketId, totpSecret]);

  useEffect(() => {
    generateQR();

    const secondsUntilNextWindow = REFRESH_INTERVAL - (Math.floor(Date.now() / 1000) % REFRESH_INTERVAL);
    setTimeLeft(secondsUntilNextWindow);

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          generateQR();
          return REFRESH_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [generateQR]);

  const progress = (timeLeft / REFRESH_INTERVAL) * 100;
  const circumference = 2 * Math.PI * 14;
  const strokeDashoffset = circumference * (1 - progress / 100);

  return (
    <div className={styles.container}>
      <div className={styles.qrWrapper}>
        {generating && (
          <div className={styles.loadingOverlay}>
            <Spinner size="md" />
          </div>
        )}
        <canvas ref={canvasRef} className={styles.canvas} />
      </div>

      <div className={styles.timerSection}>
        <svg width="36" height="36" viewBox="0 0 36 36" className={styles.timerRing}>
          <circle cx="18" cy="18" r="14" fill="none" stroke="var(--color-border)" strokeWidth="3" />
          <circle
            cx="18"
            cy="18"
            r="14"
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 18 18)"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
          <text x="18" y="23" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--color-text-primary)">
            {timeLeft}
          </text>
        </svg>
        <span className={styles.timerLabel}>Atualiza em {timeLeft}s</span>
      </div>

      <p className={styles.note}>
        Este QR Code é dinâmico e válido por {REFRESH_INTERVAL} segundos.
        <br />
        Apresente na entrada do evento.
      </p>
    </div>
  );
};

export default TicketQR;
