import { localStorage } from './local';

export interface StorageProvider {
  upload(buffer: Buffer, filename: string, mimeType: string): Promise<{ url: string }>;
  delete?(url: string): Promise<void>;
}

export function getStorage(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER || 'local';

  switch (provider) {
    case 'local':
      return localStorage;
    default:
      throw new Error(`Storage provider "${provider}" not implemented`);
  }
}
