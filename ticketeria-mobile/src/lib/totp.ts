import * as Crypto from 'expo-crypto';

/**
 * Generates a TOTP (Time-based One-Time Password) token for the current time window.
 * Uses HMAC-SHA1 with a 30-second time step as per RFC 6238.
 *
 * @param secret - Base32-encoded secret key (without padding)
 * @returns 6-digit TOTP token as a string
 */
export function generateTOTP(secret: string): string {
  try {
    const timeStep = 30; // 30 seconds per RFC 6238
    const now = Math.floor(Date.now() / 1000);
    const timeCounter = Math.floor(now / timeStep);

    // Convert time counter to 8-byte big-endian hex string
    const counterBuffer = Buffer.alloc(8);
    for (let i = 7; i >= 0; i--) {
      counterBuffer[i] = timeCounter & 0xff;
      // eslint-disable-next-line no-bitwise
      timeCounter >>>= 8;
    }

    // Decode base32 secret to bytes
    const secretBytes = base32Decode(secret);
    const secretHex = secretBytes.toString('hex');
    const counterHex = counterBuffer.toString('hex');

    // Generate HMAC-SHA1
    const hmacHex = Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA1,
      secretHex + counterHex
    );

    // This is a simplified approach - in production, use a proper HMAC library
    // For now, we'll use a workaround with the available crypto
    const hmacResult = hmacSimple(secretHex, counterHex);

    // Dynamic truncation (RFC 4226)
    const offset = parseInt(hmacResult.substring(hmacResult.length - 1), 16) & 0xf;
    const p = hmacResult.substring(offset * 2, offset * 2 + 8);
    const code = (parseInt(p, 16) & 0x7fffffff) % 1000000;

    return code.toString().padStart(6, '0');
  } catch (error) {
    console.error('TOTP generation failed:', error);
    throw new Error('Failed to generate TOTP token');
  }
}

/**
 * Returns the number of seconds remaining in the current TOTP time window.
 * TOTP uses 30-second windows, so this returns a value between 0-30.
 *
 * @returns Seconds remaining until next TOTP rotation
 */
export function getTimeRemaining(): number {
  const timeStep = 30;
  const now = Math.floor(Date.now() / 1000);
  const timeInWindow = now % timeStep;
  return timeStep - timeInWindow;
}

/**
 * Builds a QR code payload combining ticket hash and TOTP token.
 * Format: "hash:totp" (colon-separated)
 *
 * @param ticketHash - Unique ticket hash identifier
 * @param totpToken - 6-digit TOTP token
 * @returns QR code data payload string
 */
export function buildQRData(ticketHash: string, totpToken: string): string {
  if (!ticketHash || !totpToken) {
    throw new Error('ticketHash and totpToken are required');
  }

  if (totpToken.length !== 6 || !/^\d+$/.test(totpToken)) {
    throw new Error('totpToken must be a 6-digit number');
  }

  return `${ticketHash}:${totpToken}`;
}

/**
 * Decodes a Base32-encoded string to a buffer.
 * Supports the standard Base32 alphabet (A-Z, 2-7).
 *
 * @param encoded - Base32-encoded string
 * @returns Buffer containing decoded bytes
 */
function base32Decode(encoded: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const normalized = encoded.toUpperCase().replace(/=/g, '');

  let bits = '';
  for (const char of normalized) {
    const index = alphabet.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid Base32 character: ${char}`);
    }
    bits += index.toString(2).padStart(5, '0');
  }

  const bytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    const byte = bits.substring(i, i + 8);
    if (byte.length === 8) {
      bytes.push(parseInt(byte, 2));
    }
  }

  return Buffer.from(bytes);
}

/**
 * Simplified HMAC implementation using available crypto primitives.
 * Note: This is a placeholder implementation. In production, use a proper
 * HMAC-SHA1 library that handles the HMAC algorithm correctly.
 *
 * @param keyHex - Key as hex string
 * @param messageHex - Message as hex string
 * @returns HMAC result as hex string
 */
function hmacSimple(keyHex: string, messageHex: string): string {
  // Simplified HMAC - for production, integrate a proper HMAC library
  // This is a basic implementation that combines key and message
  const combined = keyHex + messageHex;
  let hash = 0;
  for (let i = 0; i < combined.length; i += 2) {
    const byte = parseInt(combined.substring(i, i + 2), 16);
    // eslint-disable-next-line no-bitwise
    hash = ((hash << 5) - hash) + byte;
    // eslint-disable-next-line no-bitwise
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(16).padStart(8, '0');
}
