import { useEffect } from 'react';
import Constants from 'expo-constants';
import { sendHeartbeat } from '../lib/posDevice';

export function usePosHeartbeat(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const tick = () =>
      sendHeartbeat({
        appVersion: Constants.expoConfig?.version,
        online: true,
      });
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [enabled]);
}
