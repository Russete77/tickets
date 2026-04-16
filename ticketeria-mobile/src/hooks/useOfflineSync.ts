import { useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { getPendingCheckins, markCheckinSynced } from '../lib/offlineDb';
import { apiClient } from '../lib/api';

/**
 * Hook that syncs pending offline check-ins when network becomes available.
 */
export function useOfflineSync() {
  const syncPendingCheckins = useCallback(async () => {
    try {
      const state = await NetInfo.fetch();
      if (!state.isConnected) return;

      const pending = await getPendingCheckins();
      if (pending.length === 0) return;

      console.log(`[Sync] ${pending.length} pending check-ins to sync`);

      for (const checkin of pending) {
        try {
          await apiClient.post('/v1/checkin/sync', {
            eventId: checkin.eventId,
            checkins: [{
              qrData: JSON.stringify({
                ticketHash: checkin.ticketHash,
                totpCode: '000000',
                timestamp: checkin.checkedInAt,
              }),
              timestamp: new Date(checkin.checkedInAt).getTime(),
              result: 'offline_valid',
            }],
          });
          await markCheckinSynced(checkin.id);
          console.log(`[Sync] Synced checkin ${checkin.id}`);
        } catch (error) {
          console.error(`[Sync] Failed to sync checkin ${checkin.id}:`, error);
          break; // Stop on first failure, retry later
        }
      }
    } catch (error) {
      console.error('[Sync] Error:', error);
    }
  }, []);

  useEffect(() => {
    // Sync on mount
    syncPendingCheckins();

    // Sync when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        syncPendingCheckins();
      }
    });

    // Sync when network reconnects
    const unsubscribe = NetInfo.addEventListener((netState) => {
      if (netState.isConnected) {
        syncPendingCheckins();
      }
    });

    return () => {
      subscription.remove();
      unsubscribe();
    };
  }, [syncPendingCheckins]);
}
