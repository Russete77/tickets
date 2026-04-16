import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { CheckoutScreen } from '@/screens/CheckoutScreen';

export default function Checkout() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();

  return <CheckoutScreen eventId={eventId || ''} />;
}
