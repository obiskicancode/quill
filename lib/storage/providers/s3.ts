import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

import { config } from '@/config';
import { ERROR_MESSAGES } from '@/constants/error-messages';

import type { StorageObject, StorageProviderAdapter } from '../provider';

/** Works with AWS S3 and S3-compatible providers such as R2, MinIO, Spaces and B2. */
export function createS3StorageProvider(): StorageProviderAdapter {
  let client: S3Client | null = null;

  function getClient(): S3Client {
    if (client) return client;
    const key = config.STORAGE.ACCESS_KEY_ID;
    const secret = config.STORAGE.SECRET_ACCESS_KEY;
    if (!key || !secret) throw new Error(ERROR_MESSAGES.S3_CREDENTIALS_MISSING);
    client = new S3Client({
      region: config.STORAGE.REGION,
      endpoint: config.STORAGE.ENDPOINT,
      forcePathStyle: config.STORAGE.FORCE_PATH_STYLE,
      credentials: { accessKeyId: key, secretAccessKey: secret },
    });
    return client;
  }

  return {
    id: 's3',
    isConfigured: () =>
      Boolean(
        config.STORAGE.BUCKET &&
        config.STORAGE.ACCESS_KEY_ID &&
        config.STORAGE.SECRET_ACCESS_KEY,
      ),
    async putObject(input: StorageObject): Promise<void> {
      const name = config.STORAGE.BUCKET;
      if (!name) throw new Error(ERROR_MESSAGES.S3_BUCKET_MISSING);
      await getClient().send(
        new PutObjectCommand({
          Bucket: name,
          Key: input.key,
          Body: input.body,
          ContentType: input.contentType,
          ContentLength: input.contentLength,
        }),
      );
    },
  };
}
