import { z } from 'zod';

export const MAX_ALERTA_LENGTH = 5000;

export const alertaSchema = z
  .object({
    alerta: z.string().trim().max(MAX_ALERTA_LENGTH, 'O alerta deve ter até 5.000 caracteres.'),
  })
  .strict();

export type AlertaFormData = z.infer<typeof alertaSchema>;
