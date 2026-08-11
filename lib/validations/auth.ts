import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Usuário (CPF, Matrícula ou E-mail) é obrigatório'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
