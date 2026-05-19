import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

/**
 * Wrappers de autenticação biométrica (Face ID / Touch ID / digital).
 * Preferências persistidas em expo-secure-store por escopo (login/pagamento/ingresso).
 */

export enum BiometricPref {
  LOGIN = 'BIOMETRICS_LOGIN',
  PAYMENT = 'BIOMETRICS_PAYMENT',
  TICKET = 'BIOMETRICS_TICKET',
}

/** Hardware presente E pelo menos uma digital/face cadastrada no device */
export async function isBiometricsAvailable(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return false;
    return await LocalAuthentication.isEnrolledAsync();
  } catch {
    return false;
  }
}

/**
 * Solicita autenticação biométrica. Retorna true só em sucesso.
 * Em devices sem biometria disponível, retorna true (não bloqueia o fluxo —
 * a checagem de disponibilidade deve ser feita antes de oferecer o toggle).
 */
export async function authenticate(reason: string): Promise<boolean> {
  const available = await isBiometricsAvailable();
  if (!available) return true;

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: 'Cancelar',
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
}

export async function isBiometricsEnabled(pref: BiometricPref): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(pref)) === 'true';
  } catch {
    return false;
  }
}

export async function setBiometricsEnabled(
  pref: BiometricPref,
  enabled: boolean,
): Promise<void> {
  await SecureStore.setItemAsync(pref, enabled ? 'true' : 'false');
}

/**
 * Gate de conveniência: se a preferência está ligada, exige biometria.
 * Retorna true se passou (ou se a preferência está desligada).
 */
export async function requireBiometricsIfEnabled(
  pref: BiometricPref,
  reason: string,
): Promise<boolean> {
  if (!(await isBiometricsEnabled(pref))) return true;
  return authenticate(reason);
}
