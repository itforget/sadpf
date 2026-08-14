import { z } from 'zod';

export const servidorSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  matricula: z.string().min(1, 'Matrícula é obrigatória'),
  cpf: z
    .string()
    .min(1, 'CPF é obrigatório')
    .regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, 'CPF inválido'),
  cargoEfetivo: z.string().min(1, 'Cargo efetivo é obrigatório'),
  cargoOcupado: z.string().optional(),
  lotacao: z.string().min(1, 'Lotação é obrigatória'),
  status: z.enum(['Ativo', 'Inativo'], {
    message: 'Status é obrigatório',
  }),
  role: z.enum(['ADMIN', 'OPERADOR', 'PASTA'], {
    message: 'Função de acesso é obrigatória',
  }),
  senha: z.string().min(12, 'Senha deve ter no mínimo 12 caracteres').optional().or(z.literal('')),
  email: z.email('Email inválido').optional().or(z.literal('')),
  telefone: z.string().optional(),
});

export type ServidorFormData = z.infer<typeof servidorSchema>;

export const servidorUpdateSchema = servidorSchema.partial().extend({
  cargoEfetivo: z.string().optional(),
  lotacao: z.string().optional(),
});
