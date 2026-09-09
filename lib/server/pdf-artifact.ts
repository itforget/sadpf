import { getStorage, type StorageBackend } from '@/lib/storage';
import { adicionarSeloDeAssinatura } from '@/lib/server/signature-watermark';

export type PdfArtifactRequest = {
  storageBackend?: StorageBackend | string | null;
  storageKey?: string | null;
  arquivoUrl: string;
  titulo: string;
  token?: string;
  assinadoEm?: Date | null;
  validationUrl?: string;
  assinante?: { nome: string; matricula: string; cargo: string };
};

export type PdfArtifact = { bytes: Uint8Array; fileName: string };

/** Centraliza download, transformação e metadados de entrega de PDFs. */
export async function getPdfArtifact(request: PdfArtifactRequest): Promise<PdfArtifact> {
  const storage = getStorage(request.storageBackend?.toLowerCase() ?? 'local');
  const arquivo = await storage.download(request.storageKey ?? request.arquivoUrl);
  const bytes =
    request.assinadoEm && request.token && request.validationUrl
      ? await adicionarSeloDeAssinatura(
          arquivo,
          request.assinadoEm,
          request.token,
          request.validationUrl,
          request.assinante
        )
      : arquivo;
  return { bytes: new Uint8Array(bytes), fileName: request.titulo.replace(/[\r\n"]/g, '_') };
}
