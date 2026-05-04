/**
 * NFC reader wrapper — Mifare Classic / Mifare DESFire / NTAG2xx.
 *
 * Usa `react-native-nfc-manager` (precisa adicionar nas deps do mobile).
 * Em desenvolvimento, sem hardware, retorna `null` ao escanear.
 *
 * Auditoria CTO 2026-05 — gap 4.4 (POS hardware)
 */
import { Platform } from 'react-native';

// Lazy require: pacote nfc-manager pode não estar instalado em todos os builds.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let NfcManager: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let NfcTech: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('react-native-nfc-manager');
  NfcManager = mod.default ?? mod;
  NfcTech = mod.NfcTech ?? {};
} catch {
  // Pacote não instalado — modo dev/web.
}

export interface NfcReadResult {
  uid: string;
  type: 'mifare_classic' | 'mifare_desfire' | 'ntag2xx';
  rawTag: unknown;
}

/** Inicializa o NFC manager. Idempotente. */
export async function initNfc(): Promise<boolean> {
  if (!NfcManager) return false;
  try {
    const supported = await NfcManager.isSupported();
    if (!supported) return false;
    await NfcManager.start();
    return true;
  } catch (err) {
    console.warn('NFC init falhou', err);
    return false;
  }
}

/** Limpa estado entre scans. */
export async function cancelNfc(): Promise<void> {
  if (!NfcManager) return;
  try {
    await NfcManager.cancelTechnologyRequest();
  } catch {
    /* ignore */
  }
}

/**
 * Aguarda usuário aproximar pulseira/cartão e retorna UID normalizado em hex.
 * Timeout default: 15s.
 */
export async function readNfcUid(timeoutMs = 15000): Promise<NfcReadResult | null> {
  if (!NfcManager || !NfcTech) {
    console.warn('NFC não disponível neste build');
    return null;
  }

  const tech = Platform.OS === 'ios' ? NfcTech.MifareIOS : NfcTech.NfcA;

  try {
    await Promise.race([
      NfcManager.requestTechnology(tech),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('NFC timeout')), timeoutMs),
      ),
    ]);

    const tag = await NfcManager.getTag();
    if (!tag) return null;

    const uid = (tag.id ?? '').toString().toUpperCase().replace(/[^0-9A-F]/g, '');
    // Heurística simples: NTAG tem 7 bytes (14 hex chars), Mifare Classic tem 4 bytes (8 chars)
    let type: NfcReadResult['type'] = 'mifare_classic';
    if (uid.length === 14) type = 'ntag2xx';
    else if (uid.length >= 16) type = 'mifare_desfire';

    return { uid, type, rawTag: tag };
  } catch (err) {
    if ((err as Error).message !== 'NFC timeout') {
      console.warn('NFC read falhou', err);
    }
    return null;
  } finally {
    await cancelNfc();
  }
}

/**
 * Escreve URL de fallback em NTAG2xx (cartão usa URL pra abrir wallet).
 * Útil pra cartões físicos que apontam pra https://pulsepass.app/w/<code>
 */
export async function writeNtagUrl(_url: string): Promise<boolean> {
  if (!NfcManager || !NfcTech) return false;
  // Implementação completa requer Ndef encoder do nfc-manager.
  // Stub para não quebrar tipos — implementar quando integrar com Sunmi.
  console.warn('writeNtagUrl não implementado — usar SDK Sunmi NFC');
  return false;
}
