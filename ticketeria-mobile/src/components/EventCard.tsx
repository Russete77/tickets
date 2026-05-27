import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  ViewStyle,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles/tokens';
import { EventSummary } from '../types';
import { Badge } from './Badge';

interface EventCardProps {
  event: EventSummary;
  onPress: (event: EventSummary) => void;
  size?: 'normal' | 'large';
}

const StarIcon = () => (
  <Text style={styles.star}>★</Text>
);

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onPress,
  size = 'normal',
}) => {
  const isLargeSize = size === 'large';
  const containerStyle = isLargeSize ? styles.largeContainer : styles.normalContainer;
  const imageStyle = isLargeSize ? styles.largeImage : styles.normalImage;
  const contentStyle = isLargeSize ? styles.largeContent : styles.normalContent;

  const remaining = event.ticketsRemaining ?? 0;
  const total = event.totalCapacity ?? 1;
  const ticketsPercentage = (remaining / total) * 100;
  const isUrgent = ticketsPercentage < 20 && remaining > 0;

  const formattedDate = new Date(event.date).toLocaleDateString('pt-BR', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <TouchableOpacity
      style={[containerStyle, styles.card]}
      onPress={() => onPress(event)}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: event.image }}
          style={imageStyle}
        />
        {isUrgent && (
          <View style={styles.urgencyBadge}>
            <Text style={styles.urgencyText}>Últimos ingressos</Text>
          </View>
        )}
      </View>

      <View style={contentStyle}>
        <View style={styles.categoryRow}>
          <Badge text={event.category} variant="info" />
        </View>

        <Text
          style={[styles.title, isLargeSize && styles.largeTitle]}
          numberOfLines={2}
        >
          {event.title}
        </Text>

        <View style={styles.ratingContainer}>
          <View style={styles.starsContainer}>
            {[...Array(5)].map((_, i) => (
              <StarIcon key={i} />
            ))}
          </View>
          <Text style={styles.ratingText}>
            {event.rating.toFixed(1)} ({event.reviewCount})
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Data</Text>
          <Text style={styles.infoValue}>{formattedDate}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Local</Text>
          <Text style={[styles.infoValue, styles.venueText]} numberOfLines={1}>
            {typeof event.venue === 'string' ? event.venue : event.venue?.name ?? ''}
          </Text>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.price}>R$ {event.price.toFixed(2)}</Text>
          {event.originalPrice && (
            <Text style={styles.originalPrice}>
              R$ {event.originalPrice.toFixed(2)}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.md,
  },
  normalContainer: {
    width: '100%',
    marginBottom: Spacing.md,
  },
  largeContainer: {
    width: 280,
    marginRight: Spacing.md,
    marginBottom: Spacing.md,
  },
  imageContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  normalImage: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.surfaceAlt,
  },
  largeImage: {
    width: 280,
    height: 240,
    backgroundColor: Colors.surfaceAlt,
  },
  urgencyBadge: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  urgencyText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.xs,
    fontWeight: '600',
  },
  normalContent: {
    padding: Spacing.md,
  },
  largeContent: {
    padding: Spacing.md,
  },
  categoryRow: {
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    lineHeight: 22,
  },
  largeTitle: {
    fontSize: Typography.fontSize.xl,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  star: {
    fontSize: 14,
    color: Colors.warning,
  },
  ratingText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  infoLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  venueText: {
    maxWidth: '60%',
  },
  priceRow: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Colors.accent,
  },
  originalPrice: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
    textDecorationLine: 'line-through',
  },
});
