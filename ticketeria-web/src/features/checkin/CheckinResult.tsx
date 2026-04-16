import React, { useEffect } from 'react';
import { Icon } from '@shared/ui/Icon/Icon';
import styles from './CheckinResult.module.css';

interface CheckinResultProps {
  show: boolean;
  data: {
    valid: boolean;
    reason?: string;
    holderName?: string;
    batchType?: string;
    ticketNumber?: string;
    status: 'valid' | 'invalid' | 'warning';
  } | null;
  onDismiss: () => void;
}

const CheckinResult: React.FC<CheckinResultProps> = ({ show, data, onDismiss }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onDismiss, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onDismiss]);

  if (!show || !data) return null;

  const isValid = data.status === 'valid';
  const isInvalid = data.status === 'invalid';
  const isWarning = data.status === 'warning';

  return (
    <div className={`${styles.overlay} ${styles[`overlay-${data.status}`]}`}>
      <div className={`${styles.resultCard} ${styles[`card-${data.status}`]}`}>
        <div className={styles.icon}>
          {isValid && <Icon name="check-circle" size={64} />}
          {isInvalid && <Icon name="x-circle" size={64} />}
          {isWarning && <Icon name="warning" size={64} />}
        </div>

        <div className={styles.content}>
          {isValid && (
            <>
              <h2 className={styles.title}>Ingresso Válido</h2>
              <div className={styles.details}>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Portador</span>
                  <span className={styles.value}>{data.holderName}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Tipo</span>
                  <span className={styles.value}>{data.batchType}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Número</span>
                  <span className={styles.value}>{data.ticketNumber}</span>
                </div>
              </div>
            </>
          )}

          {isInvalid && (
            <>
              <h2 className={styles.title}>Ingresso Inválido</h2>
              <p className={styles.message}>{data.reason}</p>
            </>
          )}

          {isWarning && (
            <>
              <h2 className={styles.title}>Atenção</h2>
              <p className={styles.message}>{data.reason}</p>
              <div className={styles.details}>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Portador</span>
                  <span className={styles.value}>{data.holderName}</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className={styles.footer}>
          <p className={styles.closeHint}>Fechando...</p>
        </div>
      </div>
    </div>
  );
};

export default CheckinResult;
