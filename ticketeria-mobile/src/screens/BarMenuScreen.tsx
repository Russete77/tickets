import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Colors } from '../styles/tokens';
import {
  getPosCatalog,
  createCustomerOrder,
  type PosProductLite,
} from '../lib/customerOrders';

interface Props {
  eventId: string;
  posId: string;
}

interface CartLine {
  product: PosProductLite;
  qty: number;
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function BarMenuScreen({ eventId, posId }: Props) {
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<CartLine[]>([]);

  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ['pos-catalog', posId],
    queryFn: () => getPosCatalog(posId),
    enabled: Boolean(posId),
  });

  const total = useMemo(
    () => cart.reduce((s, l) => s + l.product.priceCents * l.qty, 0),
    [cart],
  );

  const orderMut = useMutation({
    mutationFn: () =>
      createCustomerOrder({
        eventId,
        posId,
        items: cart.map((l) => ({ productId: l.product.id, qty: l.qty })),
      }),
    onSuccess: (order) => {
      setCart([]);
      void queryClient.invalidateQueries({ queryKey: ['my-customer-orders'] });
      Alert.alert(
        'Pedido enviado!',
        `Código de retirada: ${order.pickupCode}\nAcompanhe em "Meus pedidos".`,
        [
          { text: 'Continuar pedindo' },
          { text: 'Ver pedidos', onPress: () => router.push('/(tabs)/orders') },
        ],
      );
    },
    onError: (e: Error) => Alert.alert('Falha ao enviar pedido', e.message),
  });

  function adjust(product: PosProductLite, delta: number) {
    setCart((curr) => {
      const idx = curr.findIndex((l) => l.product.id === product.id);
      if (idx === -1) {
        if (delta <= 0) return curr;
        return [...curr, { product, qty: delta }];
      }
      const next = [...curr];
      const newQty = next[idx]!.qty + delta;
      if (newQty <= 0) next.splice(idx, 1);
      else next[idx] = { ...next[idx]!, qty: newQty };
      return next;
    });
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.textPrimary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Não foi possível carregar o cardápio.</Text>
      </View>
    );
  }

  const available = products.filter((p) => p.isAvailable);

  return (
    <View style={styles.container}>
      <FlatList
        data={available}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.header}>Cardápio do bar</Text>
        }
        renderItem={({ item }) => {
          const line = cart.find((l) => l.product.id === item.id);
          const qty = line?.qty ?? 0;
          const outOfStock = item.stockQty != null && item.stockQty <= 0;
          return (
            <View style={[styles.row, outOfStock && styles.rowDisabled]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPrice}>{formatBRL(item.priceCents)}</Text>
                {outOfStock && <Text style={styles.itemMeta}>Esgotado</Text>}
              </View>
              <View style={styles.qtyBox}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => adjust(item, -1)}
                  disabled={qty === 0}
                >
                  <Text style={styles.qtyBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qtyText}>{qty}</Text>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => adjust(item, +1)}
                  disabled={outOfStock}
                >
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.itemMeta}>Nenhum produto disponível agora.</Text>
        }
      />

      {cart.length > 0 && (
        <View style={styles.footer}>
          <ScrollView horizontal style={{ marginBottom: 8 }} showsHorizontalScrollIndicator={false}>
            {cart.map((l) => (
              <Text key={l.product.id} style={styles.summaryChip}>
                {l.qty}× {l.product.name}
              </Text>
            ))}
          </ScrollView>
          <View style={styles.footerRow}>
            <Text style={styles.total}>Total: {formatBRL(total)}</Text>
            <TouchableOpacity
              style={styles.payBtn}
              onPress={() => orderMut.mutate()}
              disabled={orderMut.isPending}
            >
              <Text style={styles.payBtnText}>
                {orderMut.isPending ? 'Enviando…' : 'Pedir'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  list: { paddingVertical: 16 },
  header: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, paddingHorizontal: 16, marginBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowDisabled: { opacity: 0.5 },
  itemName: { color: Colors.textPrimary, fontSize: 16, fontWeight: '600' },
  itemPrice: { color: Colors.textPrimary, fontSize: 14, marginTop: 4 },
  itemMeta: { color: Colors.textSecondary, fontSize: 12, marginTop: 4 },
  qtyBox: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  qtyText: { color: Colors.textPrimary, fontSize: 16, fontWeight: '600', minWidth: 32, textAlign: 'center' },
  footer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: 16,
    backgroundColor: Colors.bg,
  },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  total: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700' },
  payBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  payBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  summaryChip: {
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    fontSize: 13,
  },
  errorText: { color: '#ef4444', textAlign: 'center' },
});
