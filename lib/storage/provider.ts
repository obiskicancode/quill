/**
 * Storage adapter contracts. Providers only need to check configuration and
 * put an object; key naming and access policy belong to the caller.
 *
 * One object to write to storage.
 */
export interface StorageObject {
  key: string;
  body: Uint8Array;
  contentType: string;
  contentLength: number;
}

/** Every storage provider implements this minimal contract. */
export interface StorageProviderAdapter {
  readonly id: string;
  isConfigured(): boolean;
  putObject(input: StorageObject): Promise<void>;
}

/** Creates a storage adapter; register one factory per provider id. */
export type StorageProviderFactory = () => StorageProviderAdapter;
