import { z } from 'zod';

export const encaminhamentoSchema = z.object({
  validadeDias: z.enum(['1', '7', '15', '30']),
});

export type EncaminhamentoFormData = z.infer<typeof encaminhamentoSchema>;
