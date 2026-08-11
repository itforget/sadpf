import { z } from 'zod';

export const uploadSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório'),
  file: z
    .instanceof(File)
    .refine((file) => file.type === 'application/pdf', {
      message: 'Apenas arquivos PDF são permitidos',
    })
    .refine((file) => file.size <= 10 * 1024 * 1024, {
      message: 'Arquivo deve ter no máximo 10MB',
    }),
});

export type UploadFormData = z.infer<typeof uploadSchema>;
