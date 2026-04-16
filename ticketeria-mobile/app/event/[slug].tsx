import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { EventDetailScreen } from '@/screens/EventDetailScreen';

export default function EventDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  return <EventDetailScreen slug={slug || ''} />;
}
