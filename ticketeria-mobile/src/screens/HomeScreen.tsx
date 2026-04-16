import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../styles/tokens';
import { Event, CategoryFilter } from '../types';

const CATEGORIES: CategoryFilter[] = [
  { id: '1', name: 'Shows', slug: 'shows' },
  { id: '2', name: 'Festas', slug: 'festas' },
  { id: '3', name: 'Teatro', slug: 'teatro' },
  { id: '4', name: 'Esporte', slug: 'esporte' },
];

export function HomeScreen() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: weekendEvents, isLoading: weekendLoading } = useQuery({
    queryKey: ['events', 'weekend'],
    queryFn: () => apiClient.get<Event[]>('/events/weekend'),
  });

  const { data: trendingEvents, isLoading: trendingLoading } = useQuery({
    queryKey: ['events', 'trending'],
    queryFn: () => apiClient.get<Event[]>('/events/trending'),
  });

  const handleSearch = () => {
    if (searchText.trim()) {
      router.push({
        pathname: '/search',
        params: { q: searchText },
      });
    }
  };

  const handleEventPress = (event: Event) => {
    router.push({
      pathname: '/event/[slug]',
      params: { slug: event.slug },
    });
  };

  const EventCard = ({ event }: { event: Event }) => (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={() => handleEventPress(event)}
      activeOpacity={0.7}
    >
      <Image source={{ uri: event.coverImage }} style={styles.eventImage} />
      <View style={styles.eventCardContent}>
        <Text style={styles.eventTitle} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={styles.eventVenue} numberOfLines={1}>
          {event.venue.name}
        </Text>
        <View style={styles.eventFooter}>
          <Text style={styles.eventPrice}>R$ {event.price.toFixed(2)}</Text>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>{event.rating.toFixed(1)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Olá!</Text>
        <Text style={styles.subtitle}>Encontre seus eventos favoritos</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>Buscar</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar eventos..."
            placeholderTextColor={Colors.textTertiary}
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearch}
          />
        </View>
      </View>

      {/* Este Fim de Semana */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Este fim de semana</Text>
        {weekendLoading ? (
          <ActivityIndicator size="large" color={Colors.accent} style={styles.loader} />
        ) : (
          <FlatList
            data={weekendEvents}
            renderItem={({ item }) => <EventCard event={item} />}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        )}
      </View>

      {/* Mais Hypados */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mais hypados</Text>
        {trendingLoading ? (
          <ActivityIndicator size="large" color={Colors.accent} style={styles.loader} />
        ) : (
          <FlatList
            data={trendingEvents}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.trendingCard}
                onPress={() => handleEventPress(item)}
                activeOpacity={0.7}
              >
                <Image source={{ uri: item.coverImage }} style={styles.trendingImage} />
                <View style={styles.trendingContent}>
                  <View style={styles.trendingBadge}>
                    <Text style={styles.trendingBadgeText}>Em Alta</Text>
                  </View>
                  <Text style={styles.trendingTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.trendingDate} numberOfLines={1}>
                    {new Date(item.date).toLocaleDateString('pt-BR')}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>

      {/* Por Categoria */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Por categoria</Text>
        <FlatList
          data={CATEGORIES}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === item.id && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(item.id)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === item.id && styles.categoryChipTextActive,
                ]}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        />
      </View>

      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  greeting: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    fontWeight: '400',
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    ...Shadows.sm,
  },
  searchIcon: {
    marginRight: Spacing.md,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  section: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginLeft: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  loader: {
    marginVertical: Spacing.xl,
  },
  horizontalList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  eventCard: {
    width: 180,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    ...Shadows.sm,
  },
  eventImage: {
    width: '100%',
    height: 120,
    backgroundColor: Colors.surfaceAlt,
  },
  eventCardContent: {
    padding: Spacing.md,
  },
  eventTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  eventVenue: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventPrice: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Colors.accent,
  },
  ratingBadge: {
    backgroundColor: Colors.warning,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  ratingText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  trendingCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    ...Shadows.sm,
    flexDirection: 'row',
  },
  trendingImage: {
    width: 100,
    height: 100,
    backgroundColor: Colors.surfaceAlt,
  },
  trendingContent: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'space-between',
  },
  trendingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  trendingBadgeText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  trendingTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginVertical: Spacing.sm,
  },
  trendingDate: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
  },
  separator: {
    height: Spacing.md,
  },
  categoriesContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  categoryChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  categoryChipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  categoryChipText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
});
