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
  dataIngresso: z.string().min(1, 'Data de admissão é obrigatória'),
  status: z.enum(['Ativo', 'Inativo', 'Aposentado'], {
    message: 'Status é obrigatório',
  }),
  role: z.enum(['ADMIN', 'OPERADOR', 'PASTA'], {
    message: 'Função de acesso é obrigatória',
  }),
  senha: z.string().min(12, 'Senha deve ter no mínimo 12 caracteres').optional().or(z.literal('')),
  email: z.email('Email inválido'),
  telefone: z.string().min(1, 'Telefone é obrigatório'),
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

/** Dados que a gestão de usuários pode alterar sem acessar o cadastro pessoal. */
export const usuarioOperacionalSchema = z.object({
  status: z.enum(['Ativo', 'Inativo', 'Aposentado'], {
    message: 'Status é obrigatório',
  }),
  role: z.enum(['ADMIN', 'OPERADOR', 'PASTA'], {
    message: 'Perfil de acesso é obrigatório',
  }),
  senha: z.string().min(12, 'Senha deve ter no mínimo 12 caracteres').optional().or(z.literal('')),
});

export type UsuarioOperacionalData = z.infer<typeof usuarioOperacionalSchema>;
