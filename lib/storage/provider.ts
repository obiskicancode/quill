export interface StorageObject {
  key: string;
  body: Uint8Array;
  contentType: string;
  contentLength: number;
}

export interface StorageProviderAdapter {
  readonly id: string;
  isConfigured(): boolean;
  putObject(input: StorageObject): Promise<void>;
}

export type StorageProviderFactory = () => StorageProviderAdapter;
