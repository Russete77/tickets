import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Batch } from './EventPage';
import { Icon } from '@shared/ui/Icon/Icon';
import { formatCurrency } from '@shared/lib/formatters';
import styles from './BatchSelector.module.css';

interface BatchSelectorProps {
  batches: Batch[];
}

const BATCH_TYPE_LABELS: Record<string, string> = {
  normal: 'Normal',
  vip: 'VIP',
  backstage: 'Backstage',
  camarote: 'Camarote',
};

const BatchSelector: React.FC<BatchSelectorProps> = ({ batches }) => {
  const navigate = useNavigate();
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const safeBatches = batches ?? [];
  const visibleBatches = safeBatches.filter((b) => b.quantity > 0);

  const updateQty = (batchId: string, delta: number, max: number) => {
    setQuantities((prev) => {
      const current = prev[batchId] ?? 0;
      const next = Math.max(0, Math.min(max, current + delta));
      return { ...prev, [batchId]: next };
    });
  };

  const totalItems = Object.values(quantities).reduce((a, b) => a + b, 0);
  const totalCents = safeBatches.reduce((sum, batch) => {
    return sum + (quantities[batch.id] ?? 0) * batch.price;
  }, 0);

  const handleCheckout = () => {
    const selectedItems = safeBatches
      .filter((b) => (quantities[b.id] ?? 0) > 0)
      .map((b) => ({ batchId: b.id, quantity: quantities[b.id] }));

    if (selectedItems.length === 0) return;

    const params = new URLSearchParams();
    params.set('items', JSON.stringify(selectedItems));
    navigate(`/checkout?${params.toString()}`);
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Ingressos</h3>

      {visibleBatches.length === 0 ? (
        <div className={styles.soldOut}>
          <Icon name="ban" size={32} />
          <p>Ingressos esgotados</p>
        </div>
      ) : (
        <>
          <div className={styles.batchList}>
            {visibleBatches.map((batch) => {
              const available = batch.quantity - batch.sold;
              const isSoldOut = available <= 0;
              const isLastTickets = !isSoldOut && available <= 20;
              const qty = quantities[batch.id] ?? 0;

              return (
                <div
                  key={batch.id}
                  className={`${styles.batchItem} ${isSoldOut ? styles.soldOutItem : ''}`}
                >
                  <div className={styles.batchInfo}>
                    <div className={styles.batchHeader}>
                      <span className={styles.batchName}>{batch.name}</span>
                      <span
                        className={`${styles.batchTypeBadge} ${styles[`type_${batch.type}`]}`}
                      >
                        {BATCH_TYPE_LABELS[batch.type] ?? batch.type}
                      </span>
                    </div>
                    <span className={styles.batchPrice}>
                      {isSoldOut ? 'Esgotado' : formatCurrency(batch.price)}
                    </span>
                    {isLastTickets && (
                      <span className={styles.urgency}>
                        <Icon name="bolt" size={12} /> Últimos {available} ingressos!
                      </span>
                    )}
                  </div>

                  {!isSoldOut && (
                    <div className={styles.qtyControl}>
                      <button
                        className={styles.qtyBtn}
                        onClick={() => updateQty(batch.id, -1, batch.maxTicketsPerCpf)}
                        disabled={qty === 0}
                        aria-label="Diminuir quantidade"
                      >
                        −
                      </button>
                      <span className={styles.qtyValue}>{qty}</span>
                      <button
                        className={styles.qtyBtn}
                        onClick={() =>
                          updateQty(batch.id, 1, Math.min(batch.maxTicketsPerCpf, available))
                        }
                        disabled={qty >= Math.min(batch.maxTicketsPerCpf, available)}
                        aria-label="Aumentar quantidade"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {totalItems > 0 && (
            <div className={styles.footer}>
              <div className={styles.totalInfo}>
                <span className={styles.totalLabel}>
                  {totalItems} ingresso{totalItems > 1 ? 's' : ''}
                </span>
                <span className={styles.totalPrice}>{formatCurrency(totalCents)}</span>
              </div>
              <button className={styles.checkoutBtn} onClick={handleCheckout}>
                Comprar agora
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BatchSelector;
