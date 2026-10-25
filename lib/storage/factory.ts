import { config } from '@/config';
import { ERROR_MESSAGES } from '@/constants/error-messages';

import type {
  StorageProviderAdapter,
  StorageProviderFactory,
} from './provider';
import { createS3StorageProvider } from './providers/s3';

const registry = new Map<string, StorageProviderFactory>();
const builtins: Record<string, StorageProviderFactory> = {
  s3: createS3StorageProvider,
};

/** Add a storage provider at runtime (or from a module imported at startup). */
export function registerStorageProvider(
  id: string,
  factory: StorageProviderFactory,
): void {
  registry.set(id, factory);
}

export function getActiveStorageProviderId(): string {
  return (config.STORAGE.PROVIDER ?? 's3').toLowerCase();
}

export function createStorageProvider(
  id: string = getActiveStorageProviderId(),
): StorageProviderAdapter {
  const factory = registry.get(id) ?? builtins[id];
  if (!factory)
    throw new Error(ERROR_MESSAGES.STORAGE_PROVIDER_ADAPTER_MISSING(id));
  return factory();
}

export const getStorageProvider = createStorageProvider;

export function isStorageProviderAvailable(
  id: string = getActiveStorageProviderId(),
): boolean {
  try {
    return createStorageProvider(id).isConfigured();
  } catch {
    return false;
  }
}
