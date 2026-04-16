import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ViewStyle,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles/tokens';

interface QRTicketProps {
  ticketHash: string;
  totpSecret: string;
  holderName?: string;
  batchId?: string;
  style?: ViewStyle;
  onScreenshotAttempt?: () => void;
}

// Simple TOTP implementation
const generateTOTP = (secret: string): string => {
  const now = Math.floor(Date.now() / 1000);
  const timeCounter = Math.floor(now / 30);

  let hash = '';
  try {
    const hmac = require('crypto').createHmac('sha1', Buffer.from(secret, 'base64'));
    hmac.update(Buffer.from(timeCounter.toString(), 'utf-8'));
    hash = hmac.digest('hex');
  } catch {
    // Fallback if crypto not available in expo
    hash = 'fallback' + Math.random().toString(36).slice(2, 10);
  }

  const offset = parseInt(hash.slice(-1), 16);
  const hashSubstring = hash.slice(offset * 2, offset * 2 + 8);
  const code = (parseInt(hashSubstring, 16) & 0x7fffffff) % 1000000;

  return String(code).padStart(6, '0');
};

export const QRTicket: React.FC<QRTicketProps> = ({
  ticketHash,
  totpSecret,
  holderName = 'Portador',
  batchId = 'BATCH-001',
  style,
  onScreenshotAttempt,
}) => {
  const [totp, setTotp] = useState<string>('000000');
  const [timeRemaining, setTimeRemaining] = useState(30);
  const rotationAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Generate initial TOTP
    setTotp(generateTOTP(totpSecret));

    // Update TOTP and timer every second
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setTotp(generateTOTP(totpSecret));
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [totpSecret]);

  // Animate countdown timer
  useEffect(() => {
    Animated.timing(rotationAnim, {
      toValue: 1 - timeRemaining / 30,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [timeRemaining, rotationAnim]);

  const rotation = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Seu ingresso digital</Text>
        <Text style={styles.headerSubtitle}>Apresente o codigo ao local</Text>
      </View>

      <View style={styles.qrContainer}>
        <View style={styles.qrWrapper}>
          <QRCode
            value={`${ticketHash}|${totp}`}
            size={220}
            color="#000000"
            backgroundColor="#FFFFFF"
            quietZone={10}
          />

          <View style={styles.timerContainer}>
            <Animated.View
              style={[
                styles.timerCircle,
                { transform: [{ rotate: rotation }] },
              ]}
            >
              <View style={styles.timerInner}>
                <Text style={styles.timerText}>{timeRemaining}s</Text>
              </View>
            </Animated.View>
          </View>
        </View>

        <View style={styles.totpDisplay}>
          <Text style={styles.totpLabel}>Codigo temporal</Text>
          <Text style={styles.totpValue}>{totp}</Text>
        </View>
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Portador</Text>
          <Text style={styles.infoValue}>{holderName}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Lote</Text>
          <Text style={styles.infoValue}>{batchId}</Text>
        </View>
      </View>

      <View style={styles.screenshotBlocker}>
        <Text style={styles.screenshotText}>Nao compartilhe seu ingresso</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  headerTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  qrWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  timerContainer: {
    position: 'absolute',
    bottom: -15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: Typography.fontSize.sm,
  },
  totpDisplay: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    width: '100%',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  totpLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  totpValue: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: '700',
    color: Colors.accent,
    letterSpacing: 4,
  },
  infoContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  infoLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  screenshotBlocker: {
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  screenshotText: {
    fontSize: Typography.fontSize.sm,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
