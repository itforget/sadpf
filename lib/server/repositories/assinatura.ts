import { prisma } from '@/lib/server/prisma';
import type { StorageBackend } from '@/prisma/generated';
import { normalizarCpf } from '@/lib/cpf';

export type AssinaturaEletronica = {
  token: string;
  documento: {
    titulo: string;
    tamanho: string;
    paginas: number;
    arquivoUrl: string;
    storageBackend: StorageBackend | null;
    storageKey: string | null;
  };
  servidor: { nome: string; matricula: string; cargoEfetivo: string; cargoOcupado: string };
  dataExpiracao: Date;
  assinadoEm: Date | null;
};

export async function getAssinaturaEletronica(token: string): Promise<AssinaturaEletronica | null> {
  const encaminhamento = await prisma.encaminhamento.findUnique({
    where: { token },
    include: {
      servidor: { select: { nome: true, matricula: true, cargoEfetivo: true, cargoOcupado: true } },
      documento: {
        select: {
          titulo: true,
          tamanho: true,
          paginas: true,
          arquivoUrl: true,
          storageBackend: true,
          storageKey: true,
        },
      },
    },
  });
  if (!encaminhamento?.documento) return null;
  return {
    token: encaminhamento.token,
    documento: encaminhamento.documento,
    servidor: encaminhamento.servidor,
    dataExpiracao: encaminhamento.dataExpiracao,
    assinadoEm: encaminhamento.assinadoEm,
  };
}

export async function assinarEletronicamente(token: string, cpf: string, ip: string) {
  return prisma.$transaction(async (tx) => {
    const encaminhamento = await tx.encaminhamento.findUnique({
      where: { token },
      include: { servidor: true, documento: true },
    });
    if (!encaminhamento?.documento) return { status: 'invalido' as const };
    if (normalizarCpf(cpf) !== normalizarCpf(encaminhamento.servidor.cpf))
      return { status: 'cpf_invalido' as const };
    if (encaminhamento.assinadoEm)
      return { status: 'assinado' as const, assinadoEm: encaminhamento.assinadoEm };
    if (encaminhamento.dataExpiracao <= new Date()) return { status: 'expirado' as const };
    const assinadoEm = new Date();
    const updated = await tx.encaminhamento.updateMany({
      where: { id: encaminhamento.id, assinadoEm: null, dataExpiracao: { gt: assinadoEm } },
      data: { assinadoEm, assinadoIp: ip },
    });
    if (updated.count === 0) return { status: 'indisponivel' as const };
    await tx.logAuditoria.create({
      data: {
        operador: encaminhamento.servidor.nome,
        operadorMatricula: encaminhamento.servidor.matricula,
        acao: 'ENCAMINHAMENTO',
        detalhes: `Assinou eletronicamente o documento '${encaminhamento.documento.titulo}' por link individual.`,
        ip,
      },
    });
    return { status: 'assinado' as const, assinadoEm };
  });
}
