import { createClient } from '@supabase/supabase-js';
import type { StorageDriver } from './index';

function getClient() {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error('SUPABASE_URL e SUPABASE_SECRET_KEY são obrigatórias para o storage Supabase.');
  }

  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function getBucket() {
  return process.env.STORAGE_BUCKET || 'sadpf-documentos';
}

export const supabaseStorage: StorageDriver = {
  backend: 'supabase',

  async upload(buffer, key, mimeType) {
    const { error } = await getClient().storage.from(getBucket()).upload(key, buffer, {
      contentType: mimeType,
      upsert: false,
      cacheControl: '0',
    });
    if (error) throw new Error(`Falha no upload para Supabase Storage: ${error.message}`);
    return { backend: 'supabase', key };
  },

  async download(key) {
    const { data, error } = await getClient().storage.from(getBucket()).download(key);
    if (error || !data) throw new Error(`Falha ao ler Supabase Storage: ${error?.message}`);
    return Buffer.from(await data.arrayBuffer());
  },

  async delete(key) {
    const { error } = await getClient().storage.from(getBucket()).remove([key]);
    if (error) throw new Error(`Falha ao remover do Supabase Storage: ${error.message}`);
  },
};
