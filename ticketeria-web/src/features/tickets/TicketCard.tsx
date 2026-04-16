import React, { useState } from 'react';
import { formatDate } from '@shared/lib/formatters';
import { Badge } from '@shared/ui/Badge/Badge';
import { Modal } from '@shared/ui/Modal/Modal';
import TicketQR from './TicketQR';
import styles from './TicketCard.module.css';

export interface TicketData {
  id: string;
  eventId: string;
  eventTitle: string;
  eventCover: string;
  eventDate: string;
  venueName: string;
  venueCity: string;
  batchName: string;
  batchType: 'normal' | 'vip' | 'backstage' | 'camarote';
  holderName: string;
  status: 'active' | 'used' | 'cancelled' | 'expired';
  totpSecret: string;
  purchaseDate: string;
  orderId: string;
}

interface TicketCardProps {
  ticket: TicketData;
}

const STATUS_LABELS: Record<TicketData['status'], string> = {
  active: 'Ativo',
  used: 'Utilizado',
  cancelled: 'Cancelado',
  expired: 'Expirado',
};

const STATUS_VARIANTS: Record<TicketData['status'], 'success' | 'default' | 'danger' | 'warning'> = {
  active: 'success',
  used: 'default',
  cancelled: 'danger',
  expired: 'warning',
};

const BATCH_COLORS: Record<TicketData['batchType'], string> = {
  normal: styles.batchNormal,
  vip: styles.batchVip,
  backstage: styles.batchBackstage,
  camarote: styles.batchCamarote,
};

const TicketCard: React.FC<TicketCardProps> = ({ ticket }) => {
  const [showQR, setShowQR] = useState(false);
  const isActive = ticket.status === 'active';

  return (
    <>
      <article className={`${styles.card} ${!isActive ? styles.cardInactive : ''}`}>
        <div className={styles.imageCol}>
          <img
            src={ticket.eventCover}
            alt={ticket.eventTitle}
            className={styles.image}
            loading="lazy"
          />
        </div>

        <div className={styles.body}>
          <div className={styles.topRow}>
            <span className={`${styles.batchPill} ${BATCH_COLORS[ticket.batchType]}`}>
              {ticket.batchName}
            </span>
            <Badge variant={STATUS_VARIANTS[ticket.status]} size="sm">
              {STATUS_LABELS[ticket.status]}
            </Badge>
          </div>

          <h3 className={styles.title}>{ticket.eventTitle}</h3>

          <div className={styles.meta}>
            <div className={styles.metaItem}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>{formatDate(ticket.eventDate)}</span>
            </div>
            <div className={styles.metaItem}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span>{ticket.venueName}, {ticket.venueCity}</span>
            </div>
          </div>

          <div className={styles.footer}>
            <span className={styles.holder}>{ticket.holderName}</span>
            {isActive && (
              <button className={styles.qrButton} onClick={() => setShowQR(true)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7"/>
                  <rect x="14" y="3" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/>
                  <path d="M14 14h3v3M17 14v3h3M14 17h3"/>
                </svg>
                Ver QR Code
              </button>
            )}
          </div>
        </div>

        <div className={styles.perforation} aria-hidden="true" />
      </article>

      <Modal
        isOpen={showQR}
        onClose={() => setShowQR(false)}
        title="Ingresso — QR Code"
      >
        <TicketQR ticketId={ticket.id} totpSecret={ticket.totpSecret} />
        <div className={styles.modalMeta}>
          <p className={styles.modalEvent}>{ticket.eventTitle}</p>
          <p className={styles.modalBatch}>{ticket.batchName} · {ticket.holderName}</p>
        </div>
      </Modal>
    </>
  );
};

export default TicketCard;
