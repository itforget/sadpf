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

export const passwordResetRequestSchema = z.object({
  email: z.email('Informe um e-mail válido'),
});

export const passwordResetSchema = z
  .object({
    token: z.string().min(32, 'Link de redefinição inválido.'),
    password: z.string().min(12, 'Senha deve ter no mínimo 12 caracteres'),
    confirmPassword: z.string().min(1, 'Repita a nova senha'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
  });

export type PasswordResetFormData = z.infer<typeof passwordResetSchema>;
