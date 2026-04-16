import React from 'react';
import { useCartStore } from '@shared/stores/cartStore';
import { formatCurrency } from '@shared/lib/formatters';
import styles from './OrderSummary.module.css';

interface OrderSummaryProps {
  couponDiscount?: number;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({ couponDiscount = 0 }) => {
  const { items, getTotal, removeItem, updateQuantity } = useCartStore();
  const subtotal = getTotal();
  const serviceFee = subtotal * 0.1;
  const discount = couponDiscount;
  const total = subtotal + serviceFee - discount;

  if (items.length === 0) {
    return (
      <aside className={styles.summary}>
        <h2 className={styles.title}>Resumo do pedido</h2>
        <p className={styles.empty}>Nenhum ingresso no carrinho</p>
      </aside>
    );
  }

  return (
    <aside className={styles.summary}>
      <h2 className={styles.title}>Resumo do pedido</h2>

      <ul className={styles.items}>
        {items.map((item) => (
          <li key={item.batchId} className={styles.item}>
            <img src={item.eventCover} alt={item.eventTitle} className={styles.itemImage} />
            <div className={styles.itemInfo}>
              <span className={styles.itemTitle}>{item.eventTitle}</span>
              <span className={styles.itemBatch}>{item.batchName}</span>
              <div className={styles.itemControls}>
                <div className={styles.quantityControl}>
                  <button
                    className={styles.qtyBtn}
                    onClick={() => updateQuantity(item.batchId, item.quantity - 1)}
                    aria-label="Diminuir quantidade"
                  >
                    −
                  </button>
                  <span className={styles.qty}>{item.quantity}</span>
                  <button
                    className={styles.qtyBtn}
                    onClick={() => updateQuantity(item.batchId, item.quantity + 1)}
                    aria-label="Aumentar quantidade"
                  >
                    +
                  </button>
                </div>
                <span className={styles.itemPrice}>
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </div>
            </div>
            <button
              className={styles.removeBtn}
              onClick={() => removeItem(item.batchId)}
              aria-label="Remover item"
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      <div className={styles.breakdown}>
        <div className={styles.row}>
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className={styles.row}>
          <span>Taxa de serviço</span>
          <span>{formatCurrency(serviceFee)}</span>
        </div>
        {discount > 0 && (
          <div className={`${styles.row} ${styles.rowDiscount}`}>
            <span>Desconto (cupom)</span>
            <span>−{formatCurrency(discount)}</span>
          </div>
        )}
      </div>

      <div className={styles.total}>
        <span className={styles.totalLabel}>Total</span>
        <span className={styles.totalValue}>{formatCurrency(total)}</span>
      </div>
    </aside>
  );
};

export default OrderSummary;
