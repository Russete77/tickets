import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@shared/lib/api';
import { PublicLayout } from '@shared/layout/PublicLayout/PublicLayout';
import { Skeleton } from '@shared/ui/Skeleton/Skeleton';
import { EmptyState } from '@shared/ui/EmptyState/EmptyState';
import TicketCard, { TicketData } from './TicketCard';
import styles from './MyTicketsPage.module.css';

type Tab = 'active' | 'history';

interface GroupedTickets {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  tickets: TicketData[];
}

function groupByEvent(tickets: TicketData[]): GroupedTickets[] {
  const map = new Map<string, GroupedTickets>();
  for (const ticket of tickets) {
    if (!map.has(ticket.eventId)) {
      map.set(ticket.eventId, {
        eventId: ticket.eventId,
        eventTitle: ticket.eventTitle,
        eventDate: ticket.eventDate,
        tickets: [],
      });
    }
    map.get(ticket.eventId)!.tickets.push(ticket);
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
  );
}

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
  const grouped = groupByEvent(displayed);

  return (
    <PublicLayout>
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Meus Ingressos</h1>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'active' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('active')}
          >
            Ativos
            {!isLoading && (
              <span className={styles.tabCount}>{activeTickets.length}</span>
            )}
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'history' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Histórico
            {!isLoading && (
              <span className={styles.tabCount}>{historyTickets.length}</span>
            )}
          </button>
        </div>

        {isLoading ? (
          <div className={styles.skeletonList}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} width="100%" height="120px" borderRadius="12px" />
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <EmptyState
            title={activeTab === 'active' ? 'Nenhum ingresso ativo' : 'Nenhum ingresso no histórico'}
            description={activeTab === 'active' ? 'Compre ingressos para eventos e eles aparecerão aqui.' : 'Você ainda não utilizou nenhum ingresso.'}
          />
        ) : (
          <div className={styles.groups}>
            {grouped.map((group) => (
              <section key={group.eventId} className={styles.group}>
                <h2 className={styles.groupTitle}>{group.eventTitle}</h2>
                <div className={styles.ticketList}>
                  {group.tickets.map((ticket) => (
                    <TicketCard key={ticket.id} ticket={ticket} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
};

export default MyTicketsPage;
