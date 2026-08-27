import type { DocumentoPDF } from '@/lib/types';
import { addDocumento, getDocumentoById } from '@/lib/server/repositories/documento';
import { addLog } from '@/lib/server/repositories/auditoria';
import { getStorage, type StorageBackend } from '@/lib/storage';
import { prisma } from '@/lib/server/prisma';
import { createSupabaseSignedUploadUrl } from '@/lib/storage/supabase';
import { createDocumentStorageKey } from '@/lib/server/document-upload';

export type PersistUploadInput = {
  buffer: Buffer;
  fileSize: number;
  servidorId: string;
  servidorNome: string;
  servidorMatricula: string;
  titulo: string;
  categoria: DocumentoPDF['categoria'];
  processoSEI?: string;
  storageKey: string;
  storageBackend: StorageBackend;
  operador: string;
  operadorMatricula: string;
  ip: string;
};

export async function prepareDirectUpload(servidorId: string) {
  const storageKey = createDocumentStorageKey(servidorId);
  const { signedUrl } = await createSupabaseSignedUploadUrl(storageKey);
  return { storageKey, signedUrl };
}

async function countPages(buffer: Buffer): Promise<number> {
  try {
    const { PDF } = await import('@libpdf/core');
    return (await PDF.load(new Uint8Array(buffer))).getPageCount();
  } catch (error) {
    console.error('[upload] falha ao ler páginas do PDF:', error);
    return 1;
  }
}

/** Orquestra persistência do documento e auditoria após o upload no storage. */
export async function persistUploadedDocument(input: PersistUploadInput): Promise<DocumentoPDF> {
  const storage = getStorage(input.storageBackend);
  const existing = await prisma.documentoPDF.findFirst({
    where: { storageKey: input.storageKey },
    select: { id: true },
  });
  if (existing) {
    const documento = await getDocumentoById(existing.id);
    if (documento) return documento;
  }
  const paginas = await countPages(input.buffer);
  let documento: DocumentoPDF;
  try {
    documento = await addDocumento({
      servidorId: input.servidorId,
      titulo: input.titulo,
      categoria: input.categoria,
      dataUpload: new Date().toLocaleDateString('pt-BR'),
      tamanho: `${(input.fileSize / 1024 / 1024).toFixed(2)} MB`,
      paginas,
      processoSEI: input.processoSEI,
      arquivoUrl: input.storageKey,
      storageBackend: input.storageBackend,
      storageKey: input.storageKey,
      operadorRH: input.operador,
    });
  } catch (error) {
    await storage.delete(input.storageKey);
    throw error;
  }
  await addLog({
    operador: input.operador,
    operadorMatricula: input.operadorMatricula,
    acao: 'UPLOAD',
    detalhes: `Anexou documento PDF '${input.titulo}' na pasta do servidor ${input.servidorNome} (Mat. ${input.servidorMatricula})`,
    ip: input.ip,
  });
  return documento;
}
