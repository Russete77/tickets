import { Stack, Redirect } from 'expo-router';
import { usePosSession } from '../../src/contexts/PosSessionProvider';
import { usePosHeartbeat } from '../../src/hooks/usePosHeartbeat';
import { IS_POS } from '../../src/lib/appVariant';
import { View, ActivityIndicator } from 'react-native';

export default function PosLayout() {
  // Guard: em variant consumer (IS_POS=false), o RootLayout NÃO envolve em PosSessionProvider.
  // Chamar usePosSession aqui fora do provider quebraria o app inteiro.
  if (!IS_POS) {
    return <Redirect href="/" />;
  }
  return <PosLayoutInner />;
}

function PosLayoutInner() {
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
