import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@shared/lib/api';
import { EmptyState } from '@shared/ui/EmptyState/EmptyState';
import TicketCard, { TicketData } from './TicketCard';
import { useTranslation } from '@shared/i18n';
import { PpLayout, PButton, flyerPalette } from '@/design-system';
import styles from './MyTicketsPage.module.css';

type Tab = 'active' | 'history';

const MyTicketsPage: React.FC = () => {
  useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('active');

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['my-tickets'],
    queryFn: async () => {
      const response = await api.get<TicketData[]>('/v1/tickets/mine');
      if (response.error) throw new Error(response.error);
      return response.data ?? [];
    },
  });

  const activeTickets = (tickets ?? []).filter((t) => t.status === 'active');
  const historyTickets = (tickets ?? []).filter((t) => t.status !== 'active');
  const displayed = activeTab === 'active' ? activeTickets : historyTickets;
  const count = displayed.length;

  return (
    <PpLayout intensity={0.5}>
      <main className={styles.main}>
        {/* Header */}
        <header className={styles.header}>
          <div>
            <div className={styles.eyebrow}>Sua carteira</div>
            <h1 className={styles.title}>
              Meus{' '}
              <span className={styles.titleAccent}>ingressos</span>
            </h1>
            {!isLoading && (
              <p className={styles.subtitle}>
                {count === 0
                  ? 'Você ainda não tem ingressos. Bora descobrir um rolê?'
                  : count === 1
                  ? '1 ingresso'
                  : `${count} ingressos`}
              </p>
            )}
          </div>
        </header>

        {/* Tab pills */}
        <div className={styles.tabPills}>
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`${styles.tabPill} ${activeTab === 'active' ? styles.tabPillActive : ''}`}
          >
            Próximos
            {!isLoading && activeTickets.length > 0 && (
              <span className={styles.tabCount}>· {activeTickets.length}</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`${styles.tabPill} ${activeTab === 'history' ? styles.tabPillActive : ''}`}
          >
            Passados
            {!isLoading && historyTickets.length > 0 && (
              <span className={styles.tabCount}>· {historyTickets.length}</span>
            )}
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className={styles.grid}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className={styles.emptyWrap}>
            <div
              className={styles.emptyVisual}
              style={{
                background: `radial-gradient(60% 60% at 50% 50%, ${flyerPalette.green}, transparent 70%)`,
              }}
            />
            <EmptyState
              title={
                activeTab === 'active'
                  ? 'Nenhum ingresso ativo'
                  : 'Nenhum ingresso no histórico'
              }
              description={
                activeTab === 'active'
                  ? 'Compre ingressos para eventos e eles aparecerão aqui — com QR rotativo, cashless e transferência.'
                  : 'Você ainda não usou nenhum ingresso.'
              }
            />
            {activeTab === 'active' && (
              <Link to="/" style={{ textDecoration: 'none', marginTop: 16 }}>
                <PButton variant="primary" size="lg">
                  Descobrir eventos
                </PButton>
              </Link>
            )}
          </div>
        ) : (
          <div className={styles.grid}>
            {displayed.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}
      </main>
    </PpLayout>
  );
};

export default MyTicketsPage;
