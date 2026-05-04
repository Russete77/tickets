import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { useTranslation } from '../i18n';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../styles/tokens';
import { Event, TicketBatch } from '../types';

interface TicketHolder {
  name: string;
  cpf: string;
}

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'pix', name: 'PIX', description: 'Instantâneo' },
  { id: 'credit_card', name: 'Cartão de Crédito', description: 'Parcele em até 12x' },
  { id: 'boleto', name: 'Boleto', description: 'Válido por 3 dias' },
];

export function CheckoutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { eventId, batchId, quantity = '1' } = useLocalSearchParams<{
    eventId: string;
    batchId: string;
    quantity?: string;
  }>();

  const [ticketQuantity, setTicketQuantity] = useState(parseInt(quantity) || 1);
  const [holders, setHolders] = useState<TicketHolder[]>(
    Array(ticketQuantity).fill({ name: '', cpf: '' })
  );
  const [couponCode, setCouponCode] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('pix');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => apiClient.get<Event>(`/events/${eventId}`),
    enabled: !!eventId,
  });

  const batch = event?.ticketBatches.find((b) => b.id === batchId);

  const updateHolder = (index: number, field: keyof TicketHolder, value: string) => {
    const newHolders = [...holders];
    newHolders[index] = { ...newHolders[index], [field]: value };
    setHolders(newHolders);
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(1, ticketQuantity + delta);
    setTicketQuantity(newQuantity);
    setHolders(Array(newQuantity).fill({ name: '', cpf: '' }));
  };

  const validateHolders = (): boolean => {
    return holders.every((holder) => {
      const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
      return holder.name.trim().length > 0 && cpfRegex.test(holder.cpf);
    });
  };

  const calculateSubtotal = () => batch ? batch.price * ticketQuantity : 0;
  const platformFee = calculateSubtotal() * 0.05; // 5% platform fee
  const total = calculateSubtotal() + platformFee;

  const handleCheckout = async () => {
    if (!validateHolders()) {
      Alert.alert('Dados inválidos', 'Preencha o nome e CPF de todos os titulares corretamente');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await apiClient.post('/orders', {
        eventId,
        batchId,
        quantity: ticketQuantity,
        holders,
        couponCode: couponCode || undefined,
        paymentMethod: selectedPayment,
      });

      setOrderSuccess(true);
      setTimeout(() => {
        router.push('/my-tickets');
      }, 2000);
    } catch (error) {
      Alert.alert(
        'Erro ao processar pagamento',
        'Por favor, tente novamente ou escolha outro método'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (eventLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  if (!event || !batch) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Informações do evento não encontradas</Text>
      </View>
    );
  }

  if (orderSuccess) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successContent}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successTitle}>Compra Confirmada!</Text>
          <Text style={styles.successMessage}>
            Seus ingressos foram enviados para seu email. Redirecionando...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo do Pedido</Text>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryEventTitle}>{event.title}</Text>
            <Text style={styles.summaryDate}>
              {new Date(event.date).toLocaleDateString('pt-BR')}
            </Text>
            <Text style={styles.summaryVenue}>{event.venue.name}</Text>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Lote</Text>
              <Text style={styles.summaryValue}>{batch.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Quantidade</Text>
              <View style={styles.quantityControl}>
                <TouchableOpacity onPress={() => handleQuantityChange(-1)}>
                  <Text style={styles.quantityButton}>−</Text>
                </TouchableOpacity>
                <Text style={styles.quantityValue}>{ticketQuantity}</Text>
                <TouchableOpacity onPress={() => handleQuantityChange(1)}>
                  <Text style={styles.quantityButton}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Ticket Holders */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados dos Titulares</Text>
          {holders.map((holder, index) => (
            <View key={index} style={styles.holderCard}>
              <Text style={styles.holderLabel}>Ingresso {index + 1}</Text>
              <TextInput
                style={styles.input}
                placeholder="Nome completo"
                value={holder.name}
                onChangeText={(text) => updateHolder(index, 'name', text)}
              />
              <TextInput
                style={styles.input}
                placeholder="CPF (XXX.XXX.XXX-XX)"
                value={holder.cpf}
                onChangeText={(text) => updateHolder(index, 'cpf', text)}
                keyboardType="numeric"
              />
            </View>
          ))}
        </View>

        {/* Coupon */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cupom Promocional</Text>
          <View style={styles.couponContainer}>
            <TextInput
              style={styles.couponInput}
              placeholder="Digite seu código de cupom (opcional)"
              value={couponCode}
              onChangeText={setCouponCode}
            />
            <TouchableOpacity style={styles.couponButton}>
              <Text style={styles.couponButtonText}>Aplicar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Método de Pagamento</Text>
          {PAYMENT_METHODS.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.paymentOption,
                selectedPayment === method.id && styles.paymentOptionSelected,
              ]}
              onPress={() => setSelectedPayment(method.id)}
            >
              <View style={styles.radioButton}>
                {selectedPayment === method.id && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
              <View style={styles.paymentContent}>
                <Text style={styles.paymentName}>{method.name}</Text>
                <Text style={styles.paymentDescription}>{method.description}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Price Breakdown */}
        <View style={styles.section}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Subtotal ({ticketQuantity}x)</Text>
            <Text style={styles.priceValue}>
              R$ {calculateSubtotal().toFixed(2)}
            </Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Taxa de plataforma</Text>
            <Text style={styles.priceValue}>R$ {platformFee.toFixed(2)}</Text>
          </View>
          <View style={styles.priceDivider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>R$ {total.toFixed(2)}</Text>
          </View>
        </View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      {/* Checkout Button */}
      <View style={styles.bottomButton}>
        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={handleCheckout}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color={Colors.textPrimary} />
          ) : (
            <Text style={styles.checkoutButtonText}>Confirmar Pagamento</Text>
          )}
        </TouchableOpacity>
      </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  summaryEventTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  summaryDate: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  summaryVenue: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  summaryLabel: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
  },
  quantityButton: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Colors.accent,
    paddingVertical: Spacing.sm,
  },
  quantityValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Colors.textPrimary,
    minWidth: 30,
    textAlign: 'center',
  },
  holderCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  holderLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: Typography.fontSize.base,
    marginBottom: Spacing.md,
    color: Colors.textPrimary,
  },
  couponContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  couponInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  couponButton: {
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
  },
  couponButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  paymentOptionSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentLight + '10',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    borderColor: Colors.border,
    marginRight: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.accent,
  },
  paymentContent: {
    flex: 1,
  },
  paymentName: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  paymentDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  priceLabel: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  priceValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  priceDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.lg,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  totalValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '700',
    color: Colors.accent,
  },
  bottomButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  checkoutButton: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    ...Shadows.md,
  },
  checkoutButtonText: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bg,
  },
  successContent: {
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 80,
    marginBottom: Spacing.lg,
    color: Colors.success,
  },
  successTitle: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  successMessage: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
