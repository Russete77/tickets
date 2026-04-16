import * as Device from 'expo-device';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

/**
 * Generate a device fingerprint for the mobile app.
 * Uses device properties that are stable across app sessions.
 */
export async function generateDeviceFingerprint(): Promise<string> {
  const components: string[] = [
    Device.brand || 'unknown',
    Device.modelName || 'unknown',
    Device.osName || Platform.OS,
    Device.osVersion || 'unknown',
    String(Device.totalMemory || 0),
    Platform.OS,
    Platform.Version?.toString() || 'unknown',
  ];

  const raw = components.join('|');
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    raw,
  );
  return hash;
}

let cachedFingerprint: string | null = null;

export async function getDeviceFingerprint(): Promise<string> {
  if (!cachedFingerprint) {
    cachedFingerprint = await generateDeviceFingerprint();
  }
  return cachedFingerprint;
}
