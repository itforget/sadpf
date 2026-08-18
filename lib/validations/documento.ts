import { z } from 'zod';
import { CATEGORIAS_DOCUMENTO } from '@/lib/documentos';

export const documentoSchema = z.object({
  servidorId: z.string().min(1, 'Servidor é obrigatório'),
  titulo: z.string().min(1, 'Título é obrigatório'),
  categoria: z.enum(CATEGORIAS_DOCUMENTO, {
    message: 'Categoria é obrigatória',
  }),
  processoSEI: z.string().optional(),
  file: z
    .instanceof(File)
    .refine((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'), {
      message: 'Apenas arquivos PDF são permitidos',
    })
    .refine((file) => file.size <= 100 * 1024 * 1024, {
      message: 'Arquivo deve ter no máximo 100MB',
    }),
});

export type DocumentoFormData = z.infer<typeof documentoSchema>;
