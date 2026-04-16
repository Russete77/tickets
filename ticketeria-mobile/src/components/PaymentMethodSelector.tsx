import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles/tokens';

export type PaymentMethodType = 'pix' | 'credit_card' | 'boleto';

interface PaymentMethod {
  type: PaymentMethodType;
  name: string;
  description: string;
}

interface PaymentMethodSelectorProps {
  selected: PaymentMethodType;
  onSelect: (method: PaymentMethodType) => void;
  style?: ViewStyle;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    type: 'pix',
    name: 'PIX',
    description: 'Instantaneo',
  },
  {
    type: 'credit_card',
    name: 'Cartao de Credito',
    description: 'Parcelado em ate 12x',
  },
  {
    type: 'boleto',
    name: 'Boleto',
    description: 'Bancario',
  },
];

const PixIcon = () => (
  <Text style={styles.iconText}>P</Text>
);

const CardIcon = () => (
  <Text style={styles.iconText}>C</Text>
);

const BoletoIcon = () => (
  <Text style={styles.iconText}>B</Text>
);

const getIcon = (type: PaymentMethodType) => {
  switch (type) {
    case 'pix':
      return <PixIcon />;
    case 'credit_card':
      return <CardIcon />;
    case 'boleto':
      return <BoletoIcon />;
  }
};

const RadioButton = ({ selected }: { selected: boolean }) => (
  <View
    style={[
      styles.radioOuter,
      selected && styles.radioOuterSelected,
    ]}
  >
    {selected && <View style={styles.radioInner} />}
  </View>
);

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  selected,
  onSelect,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {PAYMENT_METHODS.map((method) => {
        const isSelected = selected === method.type;
        const isRecommended = method.type === 'pix';

        return (
          <TouchableOpacity
            key={method.type}
            style={[
              styles.methodCard,
              isSelected && styles.methodCardSelected,
            ]}
            onPress={() => onSelect(method.type)}
            activeOpacity={0.7}
          >
            <View style={styles.radioContainer}>
              <RadioButton selected={isSelected} />
            </View>

            <View style={styles.iconWrapper}>
              {getIcon(method.type)}
            </View>

            <View style={styles.contentContainer}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{method.name}</Text>
                {isRecommended && (
                  <Text style={styles.badge}>Recomendado</Text>
                )}
              </View>
              <Text style={styles.description}>{method.description}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    gap: Spacing.lg,
    ...Shadows.sm,
  },
  methodCardSelected: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(108, 92, 231, 0.05)',
  },
  radioContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: Colors.accent,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.accent,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.accent,
  },
  contentContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xs,
  },
  name: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  badge: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Colors.info,
    backgroundColor: 'rgba(0, 184, 230, 0.1)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  description: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
});
