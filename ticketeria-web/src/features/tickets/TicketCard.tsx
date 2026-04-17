import React, { useState } from 'react';
import { formatDate } from '@shared/lib/formatters';
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

const STATUS_CONFIG: Record<
  TicketData['status'],
  { label: string; className: string; dotClass: string }
> = {
  active:    { label: 'Ativo',      className: styles.statusActive,    dotClass: styles.dotActive },
  used:      { label: 'Utilizado',  className: styles.statusUsed,      dotClass: styles.dotUsed },
  cancelled: { label: 'Cancelado',  className: styles.statusCancelled, dotClass: styles.dotCancelled },
  expired:   { label: 'Expirado',   className: styles.statusExpired,   dotClass: styles.dotExpired },
};

const BATCH_CONFIG: Record<TicketData['batchType'], { label: string; className: string }> = {
  normal:    { label: 'Pista',      className: styles.batchNormal },
  vip:       { label: 'VIP',        className: styles.batchVip },
  backstage: { label: 'Backstage',  className: styles.batchBackstage },
  camarote:  { label: 'Camarote',   className: styles.batchCamarote },
};

const TicketCard: React.FC<TicketCardProps> = ({ ticket }) => {
  const [showQR, setShowQR] = useState(false);
  const isActive = ticket.status === 'active';
  const status = STATUS_CONFIG[ticket.status];
  const batch = BATCH_CONFIG[ticket.batchType];

  return (
    <>
      <article className={`${styles.card} ${!isActive ? styles.cardInactive : ''}`}>
        {/* Cover image with gradient overlay */}
        <div className={styles.coverWrap}>
          <img
            src={ticket.eventCover}
            alt={ticket.eventTitle}
            className={styles.cover}
            loading="lazy"
          />
          <div className={styles.coverOverlay} />

          {/* Batch badge top-left */}
          <span className={`${styles.batchBadge} ${batch.className}`}>
            {batch.label}
          </span>

          {/* Status indicator top-right */}
          <div className={`${styles.statusBadge} ${status.className}`}>
            <span className={`${styles.statusDot} ${status.dotClass}`} />
            {status.label}
          </div>
        </div>

        {/* Card body */}
        <div className={styles.body}>
          <h3 className={styles.title}>{ticket.eventTitle}</h3>

          <div className={styles.metaList}>
            <div className={styles.metaItem}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>{formatDate(ticket.eventDate)}</span>
            </div>
            <div className={styles.metaItem}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span>{ticket.venueName}, {ticket.venueCity}</span>
            </div>
          </div>

          {/* Divider tear */}
          <div className={styles.tear} aria-hidden="true" />

          {/* Footer */}
          <div className={styles.footer}>
            <div className={styles.holderInfo}>
              <div className={styles.holderAvatar}>
                {ticket.holderName.charAt(0).toUpperCase()}
              </div>
              <span className={styles.holderName}>{ticket.holderName}</span>
            </div>

            {isActive && (
              <button className={styles.qrBtn} onClick={() => setShowQR(true)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
      </article>

      <Modal
        isOpen={showQR}
        onClose={() => setShowQR(false)}
        title="Ingresso — QR Code"
      >
        <TicketQR ticketId={ticket.id} totpSecret={ticket.totpSecret} />
        <div className={styles.modalMeta}>
          <p className={styles.modalEvent}>{ticket.eventTitle}</p>
          <p className={styles.modalBatch}>{batch.label} · {ticket.holderName}</p>
        </div>
      </Modal>
    </>
  );
};

export default TicketCard;
