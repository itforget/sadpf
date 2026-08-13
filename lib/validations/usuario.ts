import { z } from 'zod';

export const usuarioSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  matricula: z.string().min(1, 'Matrícula é obrigatória'),
  cpf: z
    .string()
    .min(1, 'CPF é obrigatório')
    .regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, 'CPF inválido'),
  email: z.email('Email inválido'),
  senha: z.string().min(12, 'Senha deve ter no mínimo 12 caracteres'),
  status: z.enum(['Ativo', 'Inativo'], {
    message: 'Status é obrigatório',
  }),
  role: z.enum(['ADMIN', 'OPERADOR', 'PASTA'], {
    message: 'Função de acesso é obrigatória',
  }),
});

export type UsuarioFormData = z.infer<typeof usuarioSchema>;
