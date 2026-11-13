import { config } from '@/config';
import { ERROR_MESSAGES } from '@/constants/error-messages';

import type {
  StorageProviderAdapter,
  StorageProviderFactory,
} from './provider';
import { createS3StorageProvider } from './providers/supabase-bucket';

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

/**
 * Storage-provider registry and selection. Providers register a factory; the
 * active provider comes from config and is cached by callers where useful.
 */

export function getActiveStorageProviderId(): string {
  return config.STORAGE.PROVIDER.toLowerCase();
}

/** Creates the requested provider adapter, throwing when it is not registered. */
export function createStorageProvider(
  id: string = getActiveStorageProviderId(),
): StorageProviderAdapter {
  const factory = registry.get(id) ?? builtins[id];
  if (!factory)
    throw new Error(ERROR_MESSAGES.STORAGE_PROVIDER_ADAPTER_MISSING(id));
  return factory();
}

/** True when the provider exists and reports itself configured. */
export function isStorageProviderAvailable(
  id: string = getActiveStorageProviderId(),
): boolean {
  try {
    return createStorageProvider(id).isConfigured();
  } catch {
    return false;
  }
}
