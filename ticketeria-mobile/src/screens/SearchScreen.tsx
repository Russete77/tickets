import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles/tokens';
import { Event, CategoryFilter } from '../types';

const CATEGORIES: CategoryFilter[] = [
  { id: '1', name: 'Shows', slug: 'shows' },
  { id: '2', name: 'Festas', slug: 'festas' },
  { id: '3', name: 'Teatro', slug: 'teatro' },
  { id: '4', name: 'Esporte', slug: 'esporte' },
];

export function SearchScreen() {
  const router = useRouter();
  const { q: initialQuery } = useLocalSearchParams<{ q?: string }>();

  const [searchText, setSearchText] = useState(initialQuery || '');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery || '');

  const { data: results, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery, selectedCategory],
    queryFn: () =>
      apiClient.get<Event[]>(
        `/events/search?q=${debouncedQuery}${
          selectedCategory ? `&category=${selectedCategory}` : ''
        }`
      ),
    enabled: debouncedQuery.length > 0,
  });

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchText);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchText]);

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
      <View style={styles.eventContent}>
        <Text style={styles.eventTitle} numberOfLines={2}>
          {event.title}
        </Text>
        <Text style={styles.eventVenue} numberOfLines={1}>
          {event.venue.name}
        </Text>
        <View style={styles.eventFooter}>
          <Text style={styles.eventDate}>
            {new Date(event.date).toLocaleDateString('pt-BR')}
          </Text>
          <View style={styles.priceRatingContainer}>
            <Text style={styles.eventPrice}>R$ {event.price}</Text>
            <Text style={styles.eventRating}>★ {event.rating.toFixed(1)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => {
    if (!debouncedQuery) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>Buscar Eventos</Text>
          <Text style={styles.emptyStateMessage}>
            Digite o nome do evento, artista ou local para buscar
          </Text>
        </View>
      );
    }

    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateTitle}>Nenhum resultado</Text>
        <Text style={styles.emptyStateMessage}>
          Nenhum evento encontrado para "{debouncedQuery}"
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar eventos..."
          placeholderTextColor={Colors.textTertiary}
          value={searchText}
          onChangeText={setSearchText}
          returnKeyType="search"
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Text style={styles.clearIcon}>X</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filters */}
      <FlatList
        data={CATEGORIES}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.categoryChip,
              selectedCategory === item.id && styles.categoryChipActive,
            ]}
            onPress={() =>
              setSelectedCategory(selectedCategory === item.id ? null : item.id)
            }
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
        scrollEnabled={false}
        contentContainerStyle={styles.categoriesContainer}
      />

      {/* Results */}
      {debouncedQuery && results && results.length > 0 ? (
        <FlatList
          data={results}
          renderItem={({ item }) => <EventCard event={item} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.resultsContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.resultsHeader}>
              {results.length} resultado{results.length !== 1 ? 's' : ''}
            </Text>
          }
        />
      ) : (
        renderEmpty()
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    ...Shadows.sm,
  },
  searchIcon: {
    marginRight: Spacing.md,
    fontSize: 18,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  clearIcon: {
    fontSize: 18,
    color: Colors.textSecondary,
  },
  categoriesContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
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
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  categoryChipTextActive: {
    color: Colors.textInverse,
  },
  resultsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  resultsHeader: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  eventCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    ...Shadows.md,
    flexDirection: 'row',
  },
  eventImage: {
    width: 100,
    height: 100,
    backgroundColor: Colors.bgActive,
  },
  eventContent: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'space-between',
  },
  eventTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
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
  eventDate: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
  },
  priceRatingContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
  },
  eventPrice: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.accent,
  },
  eventRating: {
    fontSize: Typography.fontSize.xs,
    color: Colors.warning,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  emptyStateTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  emptyStateMessage: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
