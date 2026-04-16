import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import React from 'react';
import { Colors } from '../src/styles/tokens';
import { useNotifications } from '../src/hooks/useNotifications';
import { useOfflineSync } from '../src/hooks/useOfflineSync';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
    },
  },
});

export default function RootLayout() {
  useNotifications();
  useOfflineSync();

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.bg },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen
            name="event/[slug]"
            options={{
              headerShown: true,
              headerBackTitle: 'Voltar',
              title: 'Detalhes do Evento',
              headerStyle: { backgroundColor: Colors.bg },
              headerTintColor: Colors.textPrimary,
              headerTitleStyle: { fontWeight: '600', color: Colors.textPrimary },
            }}
          />
          <Stack.Screen
            name="checkout/[eventId]"
            options={{
              headerShown: true,
              headerBackTitle: 'Voltar',
              title: 'Pagamento',
              headerStyle: { backgroundColor: Colors.bg },
              headerTintColor: Colors.textPrimary,
              headerTitleStyle: { fontWeight: '600', color: Colors.textPrimary },
            }}
          />
          <Stack.Screen
            name="checkin"
            options={{
              headerShown: true,
              headerBackTitle: 'Voltar',
              title: 'Check-in',
              headerStyle: { backgroundColor: Colors.bg },
              headerTintColor: Colors.textPrimary,
              headerTitleStyle: { fontWeight: '600', color: Colors.textPrimary },
            }}
          />
        </Stack>
        <StatusBar style="light" />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
