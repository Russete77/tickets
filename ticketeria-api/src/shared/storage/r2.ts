/**
 * Cloudflare R2 client (S3-compatible).
 * Sub-projeto 1 (CRUDs admin) — primeira utilização: imagem de produto cashless.
 */
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../../config/env';
import { logger } from '../logger';

let _client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (_client) return _client;
  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    },
  });
  return _client;
}

export async function uploadObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
  const url = `${env.R2_PUBLIC_URL!.replace(/\/$/, '')}/${key}`;
  logger.debug({ key, url }, 'R2 uploaded');
  return url;
}

export async function deleteObject(key: string): Promise<void> {
  await getR2Client().send(
    new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }),
  );
  logger.debug({ key }, 'R2 deleted');
}
