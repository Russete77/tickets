import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { VenueMapScreen } from '@/screens/VenueMapScreen';
import { Colors } from '@/styles/tokens';

export default function VenueMapRoute() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  if (!eventId) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Evento inválido.</Text>
      </View>
    );
  }
  return <VenueMapScreen eventId={eventId} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: Colors.bg },
  error: { color: '#ef4444', textAlign: 'center' },
});
