import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../styles/tokens';

interface BadgeProps {
  text: string;
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'neutral';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  text,
  variant = 'neutral',
  style,
}) => {
  return (
    <View style={[styles.badge, styles[`variant_${variant}`], style]}>
      <Text style={[styles.text, styles[`textVariant_${variant}`]]}>
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  variant_success: {
    backgroundColor: Colors.success,
  },
  variant_danger: {
    backgroundColor: Colors.error,
  },
  variant_warning: {
    backgroundColor: Colors.warning,
  },
  variant_info: {
    backgroundColor: Colors.info,
  },
  variant_neutral: {
    backgroundColor: Colors.surfaceAlt,
  },
  text: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
  },
  textVariant_success: {
    color: '#FFFFFF',
  },
  textVariant_danger: {
    color: '#FFFFFF',
  },
  textVariant_warning: {
    color: '#FFFFFF',
  },
  textVariant_info: {
    color: '#FFFFFF',
  },
  textVariant_neutral: {
    color: Colors.textPrimary,
  },
});
