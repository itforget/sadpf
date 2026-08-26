import { z } from 'zod';
import { AcaoAuditoria } from '@/prisma/generated';

const acoesAuditoria = [
  AcaoAuditoria.CONSULTA,
  AcaoAuditoria.ATUALIZACAO,
  AcaoAuditoria.EXCLUSAO,
  AcaoAuditoria.UPLOAD,
  AcaoAuditoria.IMPRESSAO,
  AcaoAuditoria.EXPORTACAO,
  AcaoAuditoria.ENCAMINHAMENTO,
] as const;

export const logSchema = z.object({
  operador: z.string().min(1, 'Operador é obrigatório'),
  operadorMatricula: z.string().min(1, 'Matrícula do operador é obrigatória'),
  acao: z.enum(acoesAuditoria, {
    message: 'Ação é obrigatória',
  }),
  detalhes: z.string().min(1, 'Detalhes são obrigatórios'),
  ip: z.string().min(1, 'IP é obrigatório'),
});

export const auditLogSchema = z.object({
  acao: z.enum([
    'CONSULTA',
    'ATUALIZACAO',
    'EXCLUSAO',
    'UPLOAD',
    'IMPRESSAO',
    'EXPORTACAO',
    'ENCAMINHAMENTO',
  ]),
  detalhes: z.string().min(1).max(2000),
});

export type LogFormData = z.infer<typeof logSchema>;
