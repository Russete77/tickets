import React, { useState, useEffect } from 'react';
import { useSocket } from '@shared/hooks/useSocket';
import { Icon } from '@shared/ui/Icon/Icon';
import styles from './SocialProofBar.module.css';

interface PurchaseNotification {
  id: string;
  buyerFirstName: string;
  eventTitle: string;
  quantity: number;
  timestamp: number;
}

const SocialProofBar: React.FC = () => {
  const [notifications, setNotifications] = useState<PurchaseNotification[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [onlineViewers, setOnlineViewers] = useState(234);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.emit('join:home');

    const handlePurchase = (data: PurchaseNotification) => {
      setNotifications(prev => [data, ...prev.slice(0, 4)]);
    };

    const handleViewersUpdate = (count: number) => {
      setOnlineViewers(count);
    };

    socket.on('purchase:new', handlePurchase);
    socket.on('viewers:count', handleViewersUpdate);

    return () => {
      socket.off('purchase:new', handlePurchase);
      socket.off('viewers:count', handleViewersUpdate);
      socket.emit('leave:home');
    };
  }, [socket]);

  useEffect(() => {
    if (notifications.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % notifications.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [notifications.length]);

  if (notifications.length === 0) {
    return null;
  }

  const currentNotification = notifications[currentIndex];

  return (
    <div className={styles.bar}>
      <div className={styles.content}>
        <div className={styles.notificationWrapper}>
          <div
            key={currentNotification.id}
            className={styles.notification}
          >
            <span className={styles.avatar}><Icon name="user" size={16} /></span>
            <span className={styles.text}>
              <strong>{currentNotification.buyerFirstName}</strong> acabou de comprar{' '}
              {currentNotification.quantity} {currentNotification.quantity === 1 ? 'ingresso' : 'ingressos'} para{' '}
              <strong>{currentNotification.eventTitle}</strong>
            </span>
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.viewers}>
          <span className={styles.viewersDot} />
          <span className={styles.viewersText}>
            {onlineViewers.toLocaleString('pt-BR')} visualizando
          </span>
        </div>
      </div>
    </div>
  );
};

export default SocialProofBar;
