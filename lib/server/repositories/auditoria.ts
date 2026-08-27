import { prisma } from '@/lib/server/prisma';
import type { AcaoAuditoria } from '@/prisma/generated';
import type { LogAuditoria } from '@/lib/types';

export async function getLogs(): Promise<LogAuditoria[]> {
  const logs = await prisma.logAuditoria.findMany({ orderBy: { createdAt: 'desc' } });
  return logs.map((log) => ({
    id: log.id,
    dataHora: `${log.dataHora.toLocaleDateString('pt-BR')} ${log.dataHora.toLocaleTimeString(
      'pt-BR'
    )}`,
    operador: log.operador,
    operadorMatricula: log.operadorMatricula,
    acao: log.acao as LogAuditoria['acao'],
    detalhes: log.detalhes,
    ip: log.ip,
  }));
}

export async function addLog(
  logData: Omit<LogAuditoria, 'id' | 'dataHora'>
): Promise<LogAuditoria> {
  const created = await prisma.logAuditoria.create({
    data: {
      operador: logData.operador,
      operadorMatricula: logData.operadorMatricula,
      acao: logData.acao as AcaoAuditoria,
      detalhes: logData.detalhes,
      ip: logData.ip,
    },
  });
  return {
    id: created.id,
    dataHora: `${created.dataHora.toLocaleDateString(
      'pt-BR'
    )} ${created.dataHora.toLocaleTimeString('pt-BR')}`,
    operador: created.operador,
    operadorMatricula: created.operadorMatricula,
    acao: created.acao as LogAuditoria['acao'],
    detalhes: created.detalhes,
    ip: created.ip,
  };
}
