import { Stack, Redirect } from 'expo-router';
import { usePosSession } from '../../src/contexts/PosSessionProvider';
import { usePosHeartbeat } from '../../src/hooks/usePosHeartbeat';
import { View, ActivityIndicator } from 'react-native';

export default function PosLayout() {
  const { ready, paired } = usePosSession();
  usePosHeartbeat(paired);
  if (!ready) {
    return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;
  }
  if (!paired) return <Redirect href="/(pos)/setup" />;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="setup" />
      <Stack.Screen name="pin" />
      <Stack.Screen name="index" />
      <Stack.Screen name="topup" />
    </Stack>
  );
}
