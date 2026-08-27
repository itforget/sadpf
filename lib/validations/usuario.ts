import { z } from 'zod';
import { cpfEstaCompleto, formatarCpf } from '@/lib/cpf';

export const usuarioSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  matricula: z.string().min(1, 'Matrícula é obrigatória'),
  cpf: z
    .string()
    .min(1, 'CPF é obrigatório')
    .transform(formatarCpf)
    .refine(cpfEstaCompleto, 'CPF inválido'),
  email: z.email('Email inválido'),
  status: z.enum(['Ativo', 'Inativo', 'Aposentado'], {
    message: 'Status é obrigatório',
  }),
  role: z.enum(['ADMIN', 'OPERADOR', 'PASTA'], {
    message: 'Função de acesso é obrigatória',
  }),
});

export type UsuarioFormData = z.infer<typeof usuarioSchema>;
