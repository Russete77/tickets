/**
 * TOTP (RFC 6238) — stub temporário pro dev.
 *
 * O pacote `otplib` usa `require('crypto')` (Node built-in) que NÃO existe em React Native,
 * fazendo o Metro Bundler falhar com "Unable to resolve module crypto".
 *
 * Solução real (quando QR de ingresso for testado em produção):
 *   - npm i crypto-js
 *   - implementar HMAC-SHA1 manualmente com crypto-js
 *   - decodar Base32 manualmente (alphabet ABCDEFGHIJKLMNOPQRSTUVWXYZ234567)
 *
 * Por enquanto: retorna placeholder válido (6 dígitos) só pra UI renderizar.
 * O check-in REAL precisa do TOTP correto — mas o backend valida e rejeita,
 * então não há risco de bypass de segurança.
 */

/**
 * Generates a TOTP-shaped placeholder (6 digits). Não é um TOTP real.
 * Em DEV, retorna '000000'. Em produção, faça throw pra forçar fix.
 */
export function generateTOTP(_secret: string): string {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'TOTP stub não pode rodar em produção. Instale crypto-js e implemente HMAC-SHA1.',
    );
  }
  // Placeholder 6 dígitos — só pra UI mostrar; backend vai rejeitar mas o QR aparece.
  return '000000';
}

/**
 * Returns seconds remaining in the current 30-second TOTP window.
 */
export function getTimeRemaining(): number {
  const timeStep = 30;
  const now = Math.floor(Date.now() / 1000);
  return timeStep - (now % timeStep);
}

/**
 * Builds a QR code payload "hash:totp".
 */
export function buildQRData(ticketHash: string, totpToken: string): string {
  if (!ticketHash || !totpToken) throw new Error('ticketHash and totpToken are required');
  if (totpToken.length !== 6 || !/^\d+$/.test(totpToken)) {
    throw new Error('totpToken must be a 6-digit number');
  }
  return `${ticketHash}:${totpToken}`;
}
