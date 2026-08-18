import { randomBytes } from 'crypto';
import { z } from 'zod';
import type { DocumentoPDF } from '@/lib/types';
import { CATEGORIAS_DOCUMENTO } from '@/lib/documentos';

export const MAX_DOCUMENT_SIZE = 100 * 1024 * 1024;

const uploadMetadataSchema = z.object({
  servidorId: z.string().min(1, 'servidorId é obrigatório.'),
  titulo: z.string().min(1, 'Título é obrigatório.').max(255),
  categoria: z.enum(CATEGORIAS_DOCUMENTO, { message: 'Categoria inválida.' }),
  processoSEI: z.string().max(255).optional(),
  fileName: z.string().min(1, 'Nome do arquivo é obrigatório.').max(255),
  fileSize: z.number().int().positive().max(MAX_DOCUMENT_SIZE, 'Arquivo deve ter no máximo 100MB.'),
});

export const signedUploadSchema = uploadMetadataSchema;

export const completeUploadSchema = uploadMetadataSchema.extend({
  storageKey: z.string().min(1, 'Chave do arquivo é obrigatória.'),
});

export type UploadMetadata = z.infer<typeof uploadMetadataSchema>;

export function createDocumentStorageKey(servidorId: string) {
  return `documentos/${servidorId}/${randomBytes(24).toString('hex')}.pdf`;
}

export function isDocumentStorageKey(storageKey: string, servidorId: string) {
  return new RegExp(`^documentos/${escapeRegExp(servidorId)}/[a-f0-9]{48}\\.pdf$`).test(storageKey);
}

export function isPDF(fileName: string, mimeType: string, buffer: Buffer) {
  return (
    (fileName.toLowerCase().endsWith('.pdf') || mimeType === 'application/pdf') &&
    buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))
  );
}

export function documentCategory(value: string): DocumentoPDF['categoria'] {
  return value as DocumentoPDF['categoria'];
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
