import { env } from './env';

export interface JwtKeys {
  privateKey: string;
  publicKey: string;
}

export function decodeJwtKeys(privateBase64: string, publicBase64: string): JwtKeys {
  let privateKey: string;
  try {
    privateKey = Buffer.from(privateBase64, 'base64').toString('utf-8');
  } catch {
    throw new Error('JWT_PRIVATE_KEY_BASE64 is not valid base64 or does not contain a PEM private key');
  }

  if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    throw new Error('JWT_PRIVATE_KEY_BASE64 is not valid base64 or does not contain a PEM private key');
  }

  let publicKey: string;
  try {
    publicKey = Buffer.from(publicBase64, 'base64').toString('utf-8');
  } catch {
    throw new Error('JWT_PUBLIC_KEY_BASE64 is not valid base64 or does not contain a PEM public key');
  }

  if (!publicKey.includes('-----BEGIN PUBLIC KEY-----')) {
    throw new Error('JWT_PUBLIC_KEY_BASE64 is not valid base64 or does not contain a PEM public key');
  }

  return { privateKey, publicKey };
}

export const jwtKeys = decodeJwtKeys(env.JWT_PRIVATE_KEY_BASE64, env.JWT_PUBLIC_KEY_BASE64);
