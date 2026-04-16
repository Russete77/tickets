import { generateKeyPairSync } from 'crypto';

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const privateBase64 = Buffer.from(privateKey).toString('base64');
const publicBase64 = Buffer.from(publicKey).toString('base64');

console.log('=== Add these to your .env file ===\n');
console.log(`JWT_PRIVATE_KEY_BASE64=${privateBase64}\n`);
console.log(`JWT_PUBLIC_KEY_BASE64=${publicBase64}\n`);
