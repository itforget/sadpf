import { z } from 'zod';

export const encaminhamentoSchema = z.object({
  destinatario: z.string().min(1, 'Destinatário é obrigatório'),
  justificativa: z.string().min(10, 'Justificativa deve ter no mínimo 10 caracteres'),
  validadeDias: z.enum(['1', '7', '15', '30']),
  requerSenha: z.boolean(),
});

export type EncaminhamentoFormData = z.infer<typeof encaminhamentoSchema>;
