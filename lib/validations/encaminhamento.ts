import { z } from 'zod';

export const encaminhamentoSchema = z.object({
  justificativa: z.string().min(10, 'Justificativa deve ter no mínimo 10 caracteres'),
  validadeDias: z.enum(['1', '7', '15', '30']),
});

export type EncaminhamentoFormData = z.infer<typeof encaminhamentoSchema>;
