import { localStorage } from './local';
import { minioStorage } from './minio';
import { supabaseStorage } from './supabase';

export type StorageBackend = 'local' | 'supabase' | 's3';

export interface StorageDriver {
  readonly backend: StorageBackend;
  upload(buffer: Buffer, key: string, mimeType: string): Promise<StoredFile>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

export interface StoredFile {
  backend: StorageBackend;
  key: string;
}

export function getStorage(provider = process.env.STORAGE_PROVIDER || 'local'): StorageDriver {
  const normalized = provider.toLowerCase();

  switch (normalized) {
    case 'local':
      return localStorage;
    case 'supabase':
      return supabaseStorage;
    case 's3':
    case 'minio':
      return minioStorage;
    default:
      throw new Error(`Storage provider "${provider}" not implemented`);
  }
}
