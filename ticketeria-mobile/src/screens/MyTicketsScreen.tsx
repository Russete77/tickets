import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'react-native-qrcode-svg';
import { apiClient } from '../lib/api';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles/tokens';
import { Ticket } from '../types';

export function MyTicketsScreen() {
  const [qrRefreshTime, setQrRefreshTime] = useState(30);
  const [displayedQrCode, setDisplayedQrCode] = useState<string | null>(null);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['my-tickets'],
    queryFn: () => apiClient.get<Ticket[]>('/tickets/my-tickets'),
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setQrRefreshTime((prev) => {
        if (prev <= 1) {
          // QR code refresh logic here - regenerate TOTP
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleToggleQR = (ticketId: string, qrCode: string) => {
    if (expandedTicketId === ticketId) {
      setExpandedTicketId(null);
      setDisplayedQrCode(null);
    } else {
      setExpandedTicketId(ticketId);
      setDisplayedQrCode(qrCode);
      setQrRefreshTime(30);
    }
  };

  const handleTransfer = (ticketId: string) => {
    // Navigate to transfer screen
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return Colors.success;
      case 'used':
        return Colors.warning;
      case 'transferred':
        return Colors.info;
      default:
        return Colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'used':
        return 'Utilizado';
      case 'transferred':
        return 'Transferido';
      default:
        return status;
    }
  };

  const TicketCard = ({ ticket }: { ticket: Ticket }) => (
    <View style={styles.ticketCard}>
      <View style={styles.ticketHeader}>
        <View style={styles.ticketInfo}>
          <Text style={styles.ticketEventTitle} numberOfLines={1}>
            {ticket.event.title}
          </Text>
          <Text style={styles.ticketVenue} numberOfLines={1}>
            {ticket.event.venue.name}
          </Text>
          <Text style={styles.ticketDate}>
            {new Date(ticket.event.date).toLocaleDateString('pt-BR')}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(ticket.status) },
          ]}
        >
          <Text style={styles.statusText}>{getStatusLabel(ticket.status)}</Text>
        </View>
      </View>

      <View style={styles.ticketDivider} />

      <View style={styles.ticketDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Titular</Text>
          <Text style={styles.detailValue}>{ticket.holderName}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Lote</Text>
          <Text style={styles.detailValue}>{ticket.batch.name}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Código</Text>
          <Text style={styles.detailValue}>{ticket.code}</Text>
        </View>
      </View>

      {expandedTicketId === ticket.id && displayedQrCode && (
        <View style={styles.qrContainer}>
          <View style={styles.qrWrapper}>
            <QRCode
              value={displayedQrCode}
              size={200}
              color={Colors.textPrimary}
              backgroundColor={Colors.surface}
            />
          </View>

          <View style={styles.timerContainer}>
            <View style={styles.timerCircle}>
              <Text style={styles.timerText}>{qrRefreshTime}</Text>
            </View>
            <Text style={styles.timerLabel}>segundos até renovação</Text>
          </View>

          <Text style={styles.qrWarning}>
            Válido apenas para o evento. Não compartilhe este código.
          </Text>
        </View>
      )}

      <View style={styles.ticketActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleToggleQR(ticket.id, ticket.qrCode)}
        >
          <Text style={styles.actionButtonText}>
            {expandedTicketId === ticket.id ? 'Ocultar QR' : 'Mostrar QR'}
          </Text>
        </TouchableOpacity>
        {ticket.status === 'active' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonSecondary]}
            onPress={() => handleTransfer(ticket.id)}
          >
            <Text style={styles.actionButtonSecondaryText}>Transferir</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  const groupedTickets = tickets?.reduce((acc: any, ticket) => {
    const eventId = ticket.eventId;
    if (!acc[eventId]) {
      acc[eventId] = [];
    }
    acc[eventId].push(ticket);
    return acc;
  }, {}) || {};

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Meus Ingressos</Text>
          <Text style={styles.headerSubtitle}>
            {tickets?.length || 0} ingressos disponíveis
          </Text>
        </View>

        {tickets && tickets.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>Nenhum ingresso</Text>
            <Text style={styles.emptyStateMessage}>
              Você ainda não comprou nenhum ingresso. Explore eventos e compre agora!
            </Text>
          </View>
        ) : (
          <View style={styles.ticketsContainer}>
            {Object.entries(groupedTickets).map(([eventId, eventTickets]: any) => (
              <View key={eventId} style={styles.eventGroup}>
                {eventTickets.map((ticket: Ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  emptyStateTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  emptyStateMessage: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  ticketsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  eventGroup: {
    marginBottom: Spacing.lg,
  },
  ticketCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  ticketInfo: {
    flex: 1,
    marginRight: Spacing.lg,
  },
  ticketEventTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  ticketVenue: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  ticketDate: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
    marginTop: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  statusText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
  },
  ticketDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  ticketDetails: {
    marginBottom: Spacing.lg,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  detailLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  qrContainer: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  qrWrapper: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  timerCircle: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.full,
    borderWidth: 3,
    borderColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  timerText: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.accent,
  },
  timerLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  qrWarning: {
    fontSize: Typography.fontSize.xs,
    color: Colors.warning,
    textAlign: 'center',
  },
  ticketActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
  },
  actionButtonSecondary: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionButtonSecondaryText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.accent,
  },
});
