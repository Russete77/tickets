import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { apiClient } from '../lib/api';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../styles/tokens';
import { Event, Review } from '../types';

export function EventDetailScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', slug],
    queryFn: () => apiClient.get<Event>(`/events/${slug}`),
    enabled: !!slug,
  });

  const { data: reviews } = useQuery({
    queryKey: ['event', slug, 'reviews'],
    queryFn: () => apiClient.get<Review[]>(`/events/${slug}/reviews`),
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Evento não encontrado</Text>
      </View>
    );
  }

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(`https://ticketeria.com/events/${event.slug}`);
  };

  const handleBuyTickets = () => {
    if (!selectedBatchId) {
      alert('Selecione um lote de ingressos');
      return;
    }
    router.push({
      pathname: '/checkout',
      params: { eventId: event.id, batchId: selectedBatchId },
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    return `${hours}:${minutes}`;
  };

  const AvailableBatch = ({ batchId, batch }: any) => {
    const isAvailable = batch.status === 'available';
    const isSoldOut = batch.status === 'sold_out';
    const isSelected = selectedBatchId === batchId;

    return (
      <TouchableOpacity
        style={[
          styles.batchCard,
          isSelected && styles.batchCardSelected,
          !isAvailable && styles.batchCardDisabled,
        ]}
        onPress={() => isAvailable && setSelectedBatchId(batchId)}
        disabled={!isAvailable}
      >
        <View style={styles.batchHeader}>
          <Text style={styles.batchName}>{batch.name}</Text>
          {isSoldOut && <Text style={styles.soldOutBadge}>ESGOTADO</Text>}
        </View>
        {batch.description && (
          <Text style={styles.batchDescription}>{batch.description}</Text>
        )}
        <View style={styles.batchFooter}>
          <Text style={styles.batchPrice}>R$ {batch.price.toFixed(2)}</Text>
          <Text style={styles.batchQuantity}>
            {batch.quantity - batch.soldQuantity} disponível
          </Text>
        </View>
        {isSelected && <View style={styles.batchCheckmark}>✓</View>}
      </TouchableOpacity>
    );
  };

  const ReviewCard = ({ review }: { review: Review }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewName}>{review.userName}</Text>
        <View style={styles.starsContainer}>
          {[...Array(5)].map((_, i) => (
            <Text
              key={i}
              style={[
                styles.star,
                i < review.rating ? styles.starFilled : styles.starEmpty,
              ]}
            >
              ★
            </Text>
          ))}
        </View>
      </View>
      <Text style={styles.reviewTitle}>{review.title}</Text>
      <Text style={styles.reviewComment}>{review.comment}</Text>
      <Text style={styles.reviewDate}>
        {new Date(review.createdAt).toLocaleDateString('pt-BR')}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Cover Image */}
        <Image source={{ uri: event.coverImage }} style={styles.coverImage} />

        {/* Header Actions */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.back()}
          >
            <Text style={styles.actionButtonText}>Voltar</Text>
          </TouchableOpacity>
          <View style={styles.actionButtonsRight}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleCopyLink}
            >
              <Text style={styles.actionButtonText}>Compartilhar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setIsFavorite(!isFavorite)}
            >
              <Text style={styles.actionButtonText}>{isFavorite ? 'Favoritado' : 'Favoritar'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Event Info */}
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{event.title}</Text>

          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{event.category}</Text>
          </View>

          <View style={styles.metaInfo}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Data</Text>
              <Text style={styles.metaValue}>{formatDate(event.date)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Horário</Text>
              <Text style={styles.metaValue}>{formatTime(event.startTime)}</Text>
            </View>
          </View>

          <View style={styles.venueInfo}>
            <Text style={styles.venueLabel}>Local</Text>
            <Text style={styles.venueName}>{event.venue.name}</Text>
            <Text style={styles.venueAddress}>
              {event.venue.address} - {event.venue.city}, {event.venue.state}
            </Text>
          </View>

          {/* Rating */}
          <View style={styles.ratingSection}>
            <View style={styles.ratingStars}>
              {[...Array(5)].map((_, i) => (
                <Text
                  key={i}
                  style={[
                    styles.star,
                    i < Math.floor(event.rating) ? styles.starFilled : styles.starEmpty,
                  ]}
                >
                  ★
                </Text>
              ))}
            </View>
            <Text style={styles.ratingScore}>{event.rating.toFixed(1)}</Text>
            <Text style={styles.ratingCount}>({event.reviewCount} avaliações)</Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sobre o evento</Text>
          <Text style={styles.description}>{event.description}</Text>
        </View>

        {/* Lineup */}
        {event.lineup && event.lineup.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lineup</Text>
            <FlatList
              data={event.lineup}
              renderItem={({ item }) => (
                <View style={styles.lineupItem}>
                  {item.image && (
                    <Image source={{ uri: item.image }} style={styles.lineupImage} />
                  )}
                  <View style={styles.lineupContent}>
                    <Text style={styles.lineupName}>{item.name}</Text>
                    {item.role && <Text style={styles.lineupRole}>{item.role}</Text>}
                  </View>
                </View>
              )}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Timeline */}
        {event.timeline && event.timeline.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cronograma</Text>
            {event.timeline.map((item, index) => (
              <View key={index} style={styles.timelineItem}>
                <Text style={styles.timelineTime}>{item.time}</Text>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>{item.title}</Text>
                  {item.description && (
                    <Text style={styles.timelineDescription}>{item.description}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Gallery */}
        {event.images && event.images.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Galeria</Text>
            <FlatList
              data={event.images}
              renderItem={({ item }) => (
                <Image source={{ uri: item }} style={styles.galleryImage} />
              )}
              keyExtractor={(item, index) => index.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.galleryContainer}
            />
          </View>
        )}

        {/* Ticket Batches */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Escolha seu ingresso</Text>
          {event.ticketBatches.map((batch) => (
            <AvailableBatch key={batch.id} batchId={batch.id} batch={batch} />
          ))}
        </View>

        {/* Reviews */}
        {reviews && reviews.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Avaliações</Text>
            {reviews.slice(0, 3).map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </View>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      {/* Buy Button */}
      <View style={styles.bottomButton}>
        <TouchableOpacity
          style={styles.buyButton}
          onPress={handleBuyTickets}
        >
          <Text style={styles.buyButtonText}>Comprar</Text>
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
  coverImage: {
    width: '100%',
    height: 250,
    backgroundColor: Colors.surfaceAlt,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.bg,
  },
  actionButtonsRight: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    ...Shadows.sm,
  },
  actionButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Colors.accent,
  },
  eventInfo: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  eventTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accentLight,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.lg,
  },
  categoryBadgeText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Colors.accent,
  },
  metaInfo: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  metaValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  venueInfo: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  venueLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  venueName: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  venueAddress: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  ratingStars: {
    flexDirection: 'row',
  },
  ratingScore: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  ratingCount: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  star: {
    fontSize: 16,
    marginRight: Spacing.xs,
  },
  starFilled: {
    color: Colors.warning,
  },
  starEmpty: {
    color: Colors.border,
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
  description: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  lineupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  lineupImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.lg,
    marginRight: Spacing.lg,
  },
  lineupContent: {
    flex: 1,
  },
  lineupName: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  lineupRole: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  timelineTime: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Colors.accent,
    minWidth: 50,
    marginRight: Spacing.lg,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  timelineDescription: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  galleryContainer: {
    gap: Spacing.lg,
  },
  galleryImage: {
    width: 200,
    height: 150,
    borderRadius: BorderRadius.lg,
  },
  batchCard: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.surface,
  },
  batchCardSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentLight + '20',
  },
  batchCardDisabled: {
    opacity: 0.6,
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  batchName: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  soldOutBadge: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  batchDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  batchFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  batchPrice: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '700',
    color: Colors.accent,
  },
  batchQuantity: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  batchCheckmark: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    fontSize: 24,
    color: Colors.accent,
    fontWeight: '700',
  },
  reviewCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  reviewName: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  reviewTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  reviewComment: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  reviewDate: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
  },
  bottomButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  buyButton: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    ...Shadows.md,
  },
  buyButtonText: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
});
