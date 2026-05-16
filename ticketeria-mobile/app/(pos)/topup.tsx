import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { CashlessTopupScreen } from '../../src/screens/CashlessTopupScreen';
import { usePosSession } from '../../src/contexts/PosSessionProvider';
import { getStoredDeviceToken } from '../../src/lib/posDevice';

export default function PosTopup() {
  const { operator } = usePosSession();
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => { getStoredDeviceToken().then(setToken); }, []);
  if (!operator) return <Redirect href="/(pos)/pin" />;
  if (!token) return null;
  return <CashlessTopupScreen operatorJwt={token} />;
}
