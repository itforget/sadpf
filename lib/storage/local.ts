import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import type { StorageProvider } from './index';

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads');

async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

export const localStorage: StorageProvider = {
  async upload(buffer: Buffer, filename: string) {
    await ensureUploadDir();
    const filepath = join(UPLOAD_DIR, filename);
    await writeFile(filepath, buffer);
    return { url: `/uploads/${filename}` };
  },

  async delete(url: string) {
    const filename = url.replace('/uploads/', '');
    const filepath = join(UPLOAD_DIR, filename);
    try {
      await unlink(filepath);
    } catch {}
  },
};
