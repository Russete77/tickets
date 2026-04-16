import { authenticator } from 'otplib';

/**
 * Generates a TOTP (Time-based One-Time Password) token for the current time window.
 * Uses otplib (RFC 6238 compliant, HMAC-SHA1 with 30-second time step).
 *
 * @param secret - Base32-encoded secret key
 * @returns 6-digit TOTP token as a string
 */
export function generateTOTP(secret: string): string {
  return authenticator.generate(secret);
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
