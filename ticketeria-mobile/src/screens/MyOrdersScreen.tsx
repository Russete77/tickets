import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors } from '../styles/tokens';
import { getSocket } from '../lib/socket';
import {
  getMyCustomerOrders,
  cancelCustomerOrder,
  type CustomerOrder,
  type CustomerOrderStatus,
} from '../lib/customerOrders';

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function statusLabel(s: CustomerOrderStatus): string {
  return {
    pending: 'Aguardando',
    preparing: 'Em preparo',
    ready: 'Pronto p/ retirada',
    delivered: 'Entregue',
    cancelled: 'Cancelado',
  }[s];
}

function statusColor(s: CustomerOrderStatus): string {
  return {
    pending: '#9ca3af',
    preparing: '#f59e0b',
    ready: '#10b981',
    delivered: '#3b82f6',
    cancelled: '#ef4444',
  }[s];
}

export function MyOrdersScreen() {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['my-customer-orders'],
    queryFn: () => getMyCustomerOrders({ limit: 30 }),
  });

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let mounted = true;
    void (async () => {
      const s = await getSocket();
      if (!mounted) return;
      const handler = () => {
        void queryClient.invalidateQueries({ queryKey: ['my-customer-orders'] });
      };
      s.on('customer_order:status', handler);
      cleanup = () => s.off('customer_order:status', handler);
    })();
    return () => {
      mounted = false;
      cleanup?.();
    };
  }, [queryClient]);

  const cancelMut = useMutation({
    mutationFn: (orderId: string) => cancelCustomerOrder(orderId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-customer-orders'] }),
    onError: (e: Error) => Alert.alert('Não foi possível cancelar', e.message),
  });

  const orders = data?.data ?? [];

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.textPrimary} />
      </View>
    );
  }

  return (
    <FlatList
      data={orders}
      keyExtractor={(o) => o.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
      ListHeaderComponent={<Text style={styles.header}>Meus pedidos</Text>}
      ListEmptyComponent={
        <Text style={styles.empty}>Você ainda não fez nenhum pedido pelo app.</Text>
      }
      renderItem={({ item }) => <OrderCard order={item} onCancel={() => confirmCancel(item, cancelMut.mutate)} />}
    />
  );
}

function confirmCancel(order: CustomerOrder, cancel: (id: string) => void) {
  Alert.alert(
    'Cancelar pedido?',
    `Pedido ${order.pickupCode} — ${formatBRL(order.totalCents)}`,
    [
      { text: 'Não' },
      { text: 'Sim, cancelar', style: 'destructive', onPress: () => cancel(order.id) },
    ],
  );
}

function OrderCard({ order, onCancel }: { order: CustomerOrder; onCancel: () => void }) {
  const color = statusColor(order.status);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={[styles.statusBadge, { backgroundColor: color }]}>
          {statusLabel(order.status)}
        </Text>
        {order.status === 'ready' && (
          <Text style={styles.pickupCode}>{order.pickupCode}</Text>
        )}
      </View>
      {order.items?.map((it, i) => (
        <Text key={`${order.id}-${i}`} style={styles.itemLine}>
          {it.qty}× {it.name} — {formatBRL(it.priceCents * it.qty)}
        </Text>
      ))}
      <Text style={styles.total}>Total: {formatBRL(order.totalCents)}</Text>
      <Text style={styles.meta}>
        Código: {order.pickupCode} · {new Date(order.createdAt).toLocaleString('pt-BR')}
      </Text>
      {order.status === 'pending' && (
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>Cancelar pedido</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  empty: { color: Colors.textSecondary, textAlign: 'center', marginTop: 32 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusBadge: {
    color: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
  pickupCode: {
    color: '#10b981',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 2,
  },
  itemLine: { color: Colors.textPrimary, fontSize: 14, marginBottom: 2 },
  total: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700', marginTop: 8 },
  meta: { color: Colors.textSecondary, fontSize: 12, marginTop: 4 },
  cancelBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  cancelBtnText: { color: '#ef4444', fontWeight: '600' },
});
