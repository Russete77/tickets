import crypto from 'crypto';
import { env } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

/**
 * Deriva chave a partir do PLATFORM_SECRET usando PBKDF2
 */
function deriveKey(salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(env.PLATFORM_SECRET, salt, ITERATIONS, KEY_LENGTH, 'sha256');
}

/**
 * Criptografa texto com AES-256-GCM
 * Retorna: salt:iv:authTag:encrypted (base64)
 */
export function encrypt(plaintext: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([salt, iv, authTag, encrypted]).toString('base64');
}

/**
 * Descriptografa texto criptografado com AES-256-GCM
 */
export function decrypt(ciphertext: string): string {
  const data = Buffer.from(ciphertext, 'base64');

  const salt = data.subarray(0, SALT_LENGTH);
  const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

  const key = deriveKey(salt);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return decipher.update(encrypted) + decipher.final('utf8');
}

/**
 * Gera hash SHA-256 para ticket
 */
export function generateTicketHash(
  ticketId: string,
  eventId: string,
  holderCpf: string,
): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const data = `${ticketId}:${eventId}:${holderCpf}:${salt}:${env.PLATFORM_SECRET}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Gera secret TOTP aleatório (base32)
 */
export function generateTotpSecret(): string {
  return crypto.randomBytes(20).toString('hex');
}

/**
 * Gera código OTP numérico de 6 dígitos
 */
export function generateOtpCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Gera UUID v4
 */
export function generateUuid(): string {
  return crypto.randomUUID();
}
