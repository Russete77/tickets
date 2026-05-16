import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { CashlessPOSScreen } from '../../src/screens/CashlessPOSScreen';
import { usePosSession } from '../../src/contexts/PosSessionProvider';
import { getStoredDeviceToken } from '../../src/lib/posDevice';

export default function PosHome() {
  const { posId, operator } = usePosSession();
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => { getStoredDeviceToken().then(setToken); }, []);
  if (!operator) return <Redirect href="/(pos)/pin" />;
  if (!posId || !token) return null;
  return <CashlessPOSScreen posId={posId} operatorJwt={token} />;
}
