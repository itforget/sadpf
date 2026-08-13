import { readFile, writeFile, unlink, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import type { StorageDriver } from './index';

const UPLOAD_DIR = join(process.cwd(), 'storage', 'uploads');
const LEGACY_UPLOAD_DIR = join(process.cwd(), 'public', 'uploads');

function getKey(value: string): string {
  const key = value.startsWith('storage://uploads/')
    ? value.slice('storage://uploads/'.length)
    : value.startsWith('/uploads/')
    ? value.slice('/uploads/'.length)
    : value;
  if (!key.split('/').every((part) => /^[a-zA-Z0-9._-]+$/.test(part))) {
    throw new Error('Chave de arquivo inválida.');
  }
  return key;
}

function getFilePath(key: string): string {
  const directory = key.startsWith('/uploads/') ? LEGACY_UPLOAD_DIR : UPLOAD_DIR;
  return join(directory, getKey(key));
}

async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

export const localStorage: StorageDriver = {
  backend: 'local',

  async upload(buffer: Buffer, key: string) {
    const filepath = getFilePath(key);
    await ensureUploadDir();
    await mkdir(dirname(filepath), { recursive: true });
    await writeFile(filepath, buffer);
    return { backend: 'local', key };
  },

  async download(key: string) {
    return readFile(getFilePath(key));
  },

  async delete(key: string) {
    const filepath = getFilePath(key);
    try {
      await unlink(filepath);
    } catch {}
  },
};
