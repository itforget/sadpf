import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Informe um e-mail válido'),
  password: z
    .string()
    .min(12, 'Senha deve ter no mínimo 12 caracteres')
    .optional()
    .or(z.literal('')),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const passwordResetSchema = z.object({
  token: z.string().min(32, 'Link de redefinição inválido.'),
  password: z.string().min(12, 'Senha deve ter no mínimo 12 caracteres'),
});

export type PasswordResetFormData = z.infer<typeof passwordResetSchema>;
