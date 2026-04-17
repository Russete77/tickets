import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@shared/lib/api';
import { PublicLayout } from '@shared/layout/PublicLayout/PublicLayout';
import { Skeleton } from '@shared/ui/Skeleton/Skeleton';
import { formatCurrency, formatDate } from '@shared/lib/formatters';
import styles from './OrderDetailsPage.module.css';

// ── Types ──────────────────────────────────────────────────────────────────

type OrderStatus = 'pending' | 'confirmed' | 'cancelled' | 'refunded';
type PaymentMethod = 'pix' | 'credit_card' | 'boleto';

interface OrderTicket {
  id: string;
  holderName: string;
  batchName: string;
  batchType: string;
  price: number;
  qrCodeUrl: string;
}

interface OrderDetails {
  id: string;
  status: OrderStatus;
  createdAt: string;
  event: {
    id: string;
    title: string;
    startDate: string;
    coverImage: string;
    venue: { name: string; city: string; state: string };
  };
  tickets: OrderTicket[];
  payment: {
    method: PaymentMethod;
    amountCents: number;
    pixCode?: string;
    paidAt?: string;
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<OrderStatus, { label: string; cls: string }> = {
  pending:   { label: 'Pendente',   cls: styles.statusPending },
  confirmed: { label: 'Confirmado', cls: styles.statusConfirmed },
  cancelled: { label: 'Cancelado',  cls: styles.statusCancelled },
  refunded:  { label: 'Reembolsado', cls: styles.statusRefunded },
};

const METHOD_LABEL: Record<PaymentMethod, string> = {
  pix: 'Pix',
  credit_card: 'Cartão de crédito',
  boleto: 'Boleto',
};

// ── Component ──────────────────────────────────────────────────────────────

const OrderDetailsPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const response = await api.get<OrderDetails>(`/v1/orders/${orderId}`);
      if (response.error) throw new Error(response.error);
      return response.data!;
    },
    enabled: !!orderId,
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.post(`/v1/orders/${orderId}/cancel`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', orderId] });
    },
  });

  if (error) {
    return (
      <PublicLayout>
        <div className={styles.errorState}>
          <div className={styles.errorIcon}>📋</div>
          <h1>Pedido não encontrado</h1>
          <p>Este pedido pode não existir ou você não tem permissão para visualizá-lo.</p>
          <button className={styles.backBtn} onClick={() => navigate('/tickets')}>
            Ver meus ingressos
          </button>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <button className={styles.backLink} onClick={() => navigate(-1)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Voltar
          </button>
          <h1 className={styles.pageTitle}>Detalhes do Pedido</h1>
        </div>

        {isLoading ? (
          <div className={styles.skeletonGrid}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} width="100%" height="200px" borderRadius="12px" />
            ))}
          </div>
        ) : order ? (
          <div className={styles.content}>
            {/* ── Order Summary Card ── */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.orderIdRow}>
                  <h2 className={styles.orderId}>Pedido #{order.id.slice(-8).toUpperCase()}</h2>
                  <span className={`${styles.statusBadge} ${STATUS_CONFIG[order.status]?.cls}`}>
                    {STATUS_CONFIG[order.status]?.label ?? order.status}
                  </span>
                </div>
                <p className={styles.orderDate}>
                  Realizado em {formatDate(order.createdAt)}
                </p>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.eventSummary}>
                  {order.event.coverImage && (
                    <img
                      src={order.event.coverImage}
                      alt={order.event.title}
                      className={styles.eventCover}
                    />
                  )}
                  <div className={styles.eventInfo}>
                    <h3 className={styles.eventTitle}>{order.event.title}</h3>
                    <p className={styles.eventMeta}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      {formatDate(order.event.startDate)}
                    </p>
                    <p className={styles.eventMeta}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
                      </svg>
                      {order.event.venue.name} — {order.event.venue.city}, {order.event.venue.state}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Tickets ── */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>
                  Ingressos ({order.tickets.length})
                </h2>
              </div>
              <div className={styles.ticketsList}>
                {order.tickets.map((ticket) => (
                  <div key={ticket.id} className={styles.ticketRow}>
                    <div className={styles.ticketInfo}>
                      <div className={styles.ticketQrWrap}>
                        <img
                          src={ticket.qrCodeUrl}
                          alt={`QR ${ticket.id}`}
                          className={styles.ticketQr}
                        />
                      </div>
                      <div className={styles.ticketDetails}>
                        <p className={styles.ticketHolder}>{ticket.holderName}</p>
                        <p className={styles.ticketBatch}>{ticket.batchName}</p>
                        <span className={styles.batchTypeBadge}>{ticket.batchType}</span>
                      </div>
                    </div>
                    <div className={styles.ticketPrice}>{formatCurrency(ticket.price)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Payment ── */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Informações de Pagamento</h2>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.paymentGrid}>
                  <div className={styles.paymentItem}>
                    <span className={styles.paymentLabel}>Método</span>
                    <span className={styles.paymentValue}>{METHOD_LABEL[order.payment.method] ?? order.payment.method}</span>
                  </div>
                  <div className={styles.paymentItem}>
                    <span className={styles.paymentLabel}>Total</span>
                    <span className={`${styles.paymentValue} ${styles.paymentTotal}`}>
                      {formatCurrency(order.payment.amountCents)}
                    </span>
                  </div>
                  {order.payment.paidAt && (
                    <div className={styles.paymentItem}>
                      <span className={styles.paymentLabel}>Pago em</span>
                      <span className={styles.paymentValue}>{formatDate(order.payment.paidAt)}</span>
                    </div>
                  )}
                </div>

                {order.payment.method === 'pix' && order.payment.pixCode && order.status === 'pending' && (
                  <div className={styles.pixSection}>
                    <p className={styles.pixLabel}>Código PIX (Copia e Cola)</p>
                    <div className={styles.pixCodeRow}>
                      <code className={styles.pixCode}>{order.payment.pixCode}</code>
                      <button
                        className={styles.copyBtn}
                        onClick={() => navigator.clipboard.writeText(order.payment.pixCode!)}
                      >
                        Copiar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Actions ── */}
            <div className={styles.actions}>
              <button
                className={styles.downloadBtn}
                onClick={() => window.print()}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Baixar Ingressos
              </button>

              {order.status === 'pending' && (
                <button
                  className={styles.cancelBtn}
                  onClick={() => {
                    if (window.confirm('Tem certeza que deseja cancelar este pedido?')) {
                      cancelMutation.mutate();
                    }
                  }}
                  disabled={cancelMutation.isPending}
                >
                  {cancelMutation.isPending ? 'Cancelando...' : 'Cancelar Pedido'}
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </PublicLayout>
  );
};

export default OrderDetailsPage;
