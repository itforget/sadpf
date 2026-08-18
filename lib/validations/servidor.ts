import { z } from 'zod';

export const servidorSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  matricula: z.string().min(1, 'Matrícula é obrigatória'),
  matriculaCargoEfetivo: z.string().min(1, 'Matrícula do cargo efetivo é obrigatória'),
  cpf: z
    .string()
    .min(1, 'CPF é obrigatório')
    .regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, 'CPF inválido'),
  cargoEfetivo: z.string().min(1, 'Cargo efetivo é obrigatório'),
  cargoOcupado: z.string().optional(),
  lotacao: z.string().min(1, 'Lotação é obrigatória'),
  dataIngresso: z.string().min(1, 'Data de admissão é obrigatória').optional(),
  status: z.enum(['Ativo', 'Inativo', 'Aposentado'], {
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
  fotoUrl: z
    .string()
    .refine(
      (value) => value === '' || /^data:image\/(png|jpeg|jpg);base64,/.test(value),
      'Imagem inválida'
    )
    .optional(),
});
