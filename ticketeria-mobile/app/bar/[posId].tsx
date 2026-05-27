import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { BarMenuScreen } from '@/screens/BarMenuScreen';
import { Colors } from '@/styles/tokens';

export default function BarRoute() {
  const { posId, eventId } = useLocalSearchParams<{ posId: string; eventId?: string }>();

  if (!posId || !eventId) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Bar inválido. Volte e tente novamente.</Text>
      </View>
    );
  }

  return <BarMenuScreen posId={posId} eventId={eventId} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: Colors.bg },
  error: { color: '#ef4444', textAlign: 'center' },
});
