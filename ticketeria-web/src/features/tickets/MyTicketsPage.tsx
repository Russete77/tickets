import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@shared/lib/api';
import { PublicLayout } from '@shared/layout/PublicLayout/PublicLayout';
import { Skeleton } from '@shared/ui/Skeleton/Skeleton';
import { EmptyState } from '@shared/ui/EmptyState/EmptyState';
import TicketCard, { TicketData } from './TicketCard';
import styles from './MyTicketsPage.module.css';

type Tab = 'active' | 'history';

const MyTicketsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('active');

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['my-tickets'],
    queryFn: async () => {
      const response = await api.get<TicketData[]>('/v1/tickets/mine');
      if (response.error) throw new Error(response.error);
      return response.data!;
    },
  });

  const activeTickets = (tickets ?? []).filter((t) => t.status === 'active');
  const historyTickets = (tickets ?? []).filter((t) => t.status !== 'active');
  const displayed = activeTab === 'active' ? activeTickets : historyTickets;
  const count = displayed.length;

  return (
    <PublicLayout>
      <div className={styles.page}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Meus Ingressos</h1>
            {!isLoading && (
              <p className={styles.subtitle}>
                {count === 0
                  ? 'Nenhum ingresso encontrado'
                  : count === 1
                  ? '1 ingresso'
                  : `${count} ingressos`}
              </p>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className={styles.tabBar}>
          <button
            className={`${styles.tab} ${activeTab === 'active' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('active')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            Ativos
            {!isLoading && (
              <span className={`${styles.tabBadge} ${activeTab === 'active' ? styles.tabBadgeActive : ''}`}>
                {activeTickets.length}
              </span>
            )}
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'history' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="12 8 12 12 14 14"/>
              <path d="M3.05 11a9 9 0 1 0 .5-4M3 3v4h4"/>
            </svg>
            Histórico
            {!isLoading && (
              <span className={`${styles.tabBadge} ${activeTab === 'history' ? styles.tabBadgeActive : ''}`}>
                {historyTickets.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className={styles.grid}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} width="100%" height="280px" borderRadius="20px" />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <EmptyState
            title={activeTab === 'active' ? 'Nenhum ingresso ativo' : 'Nenhum ingresso no histórico'}
            description={
              activeTab === 'active'
                ? 'Compre ingressos para eventos e eles aparecerão aqui.'
                : 'Você ainda não utilizou nenhum ingresso.'
            }
          />
        ) : (
          <div className={styles.grid}>
            {displayed.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
};

export default MyTicketsPage;
