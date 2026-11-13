/**
 * Transfer-proof storage. Proofs are private objects keyed by reservation
 * reference; the active provider is cached until the configured id changes.
 */

import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

import { ERROR_MESSAGES } from '@/constants/error-messages';

import { createStorageProvider, getActiveStorageProviderId } from './factory';
import type { StorageProviderAdapter } from './provider';

const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

let cached: { id: string; provider: StorageProviderAdapter } | null = null;

function getProofStorage(): StorageProviderAdapter {
  const id = getActiveStorageProviderId();
  if (cached?.id !== id) cached = { id, provider: createStorageProvider(id) };
  return cached.provider;
}

/** True when proof storage is configured and can accept uploads. */
export function proofStorageConfigured(): boolean {
  try {
    return getProofStorage().isConfigured();
  } catch {
    return false;
  }
}

/** Uploads a transfer receipt and returns the object key stored on the payment proof row. */
export async function uploadProof(input: {
  reference: string;
  file: File;
}): Promise<string> {
  if (!proofStorageConfigured())
    throw new Error(ERROR_MESSAGES.PROOF_STORAGE_NOT_CONFIGURED);
  const ext = MIME_EXT[input.file.type] || extname(input.file.name) || '.bin';
  const key = `proofs/${input.reference}/${randomUUID()}${ext}`;
  await getProofStorage().putObject({
    key,
    body: new Uint8Array(await input.file.arrayBuffer()),
    contentType: input.file.type,
    contentLength: input.file.size,
  });
  return key;
}
