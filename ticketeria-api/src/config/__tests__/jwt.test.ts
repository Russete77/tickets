import { describe, it, expect, vi } from 'vitest';
import { generateKeyPairSync } from 'crypto';

// Unmock so we test the real implementation, not the global setup mock
vi.unmock('../jwt');

const { decodeJwtKeys } = await vi.importActual<typeof import('../jwt')>('../jwt');

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const privateBase64 = Buffer.from(privateKey).toString('base64');
const publicBase64 = Buffer.from(publicKey).toString('base64');

describe('JWT Key Config', () => {
  it('should decode base64 keys to PEM strings', () => {
    const keys = decodeJwtKeys(privateBase64, publicBase64);

    expect(keys.privateKey).toContain('-----BEGIN PRIVATE KEY-----');
    expect(keys.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
  });

  it('should throw if private key base64 is invalid', () => {
    expect(() => decodeJwtKeys('not-a-pem-key', publicBase64)).toThrow(
      'JWT_PRIVATE_KEY_BASE64 is not valid base64 or does not contain a PEM private key'
    );
  });

  it('should throw if public key base64 is invalid', () => {
    expect(() => decodeJwtKeys(privateBase64, 'not-a-pem-key')).toThrow(
      'JWT_PUBLIC_KEY_BASE64 is not valid base64 or does not contain a PEM public key'
    );
  });
});
