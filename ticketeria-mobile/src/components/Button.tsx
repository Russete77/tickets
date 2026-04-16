import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../styles/tokens';
import * as Haptics from 'expo-haptics';

interface ButtonProps {
  title: string;
  onPress: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const handlePress = async () => {
    if (disabled || loading) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics not available
    }

    setIsPressed(true);
    try {
      await onPress();
    } finally {
      setIsPressed(false);
    }
  };

  const containerStyle = [
    styles.container,
    styles[`variant_${variant}`],
    styles[`size_${size}`],
    (disabled || loading) && styles.disabled,
    isPressed && styles.pressed,
    style,
  ];

  const textStyle = [
    styles.text,
    styles[`textSize_${size}`],
    styles[`textVariant_${variant}`],
  ];

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        {icon && !loading && <View style={styles.iconContainer}>{icon}</View>}
        {loading && (
          <ActivityIndicator
            color={variant === 'ghost' ? Colors.accent : '#FFFFFF'}
            style={styles.spinner}
          />
        )}
        <Text style={textStyle}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  text: {
    fontWeight: '600',
  },
  variant_primary: {
    backgroundColor: Colors.accent,
  },
  variant_secondary: {
    backgroundColor: Colors.accentDark,
  },
  variant_danger: {
    backgroundColor: Colors.error,
  },
  variant_ghost: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  size_sm: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 32,
  },
  size_md: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 44,
  },
  size_lg: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    minHeight: 52,
  },
  textSize_sm: {
    fontSize: Typography.fontSize.sm,
  },
  textSize_md: {
    fontSize: Typography.fontSize.base,
  },
  textSize_lg: {
    fontSize: Typography.fontSize.lg,
  },
  textVariant_primary: {
    color: '#FFFFFF',
  },
  textVariant_secondary: {
    color: '#FFFFFF',
  },
  textVariant_danger: {
    color: '#FFFFFF',
  },
  textVariant_ghost: {
    color: Colors.accent,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    marginRight: Spacing.xs,
  },
});
