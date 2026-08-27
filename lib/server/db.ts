import { prisma } from './prisma';
import type {
  Prisma,
  StatusServidor,
  CategoriaDocumento,
  AcaoAuditoria,
  StorageBackend,
} from '@/prisma/generated';
import type { Servidor, DocumentoPDF, LogAuditoria, NovoDocumentoPDF } from '../types';
import { formatarCpf } from '@/lib/cpf';

const SERVIDOR_SELECT = {
  id: true,
  matricula: true,
  matriculaCargoEfetivo: true,
  nome: true,
  cpf: true,
  fotoUrl: true,
  fotoStorageBackend: true,
  fotoStorageKey: true,
  fotoMimeType: true,
  cargoEfetivo: true,
  cargoOcupado: true,
  lotacao: true,
  status: true,
  role: true,
  dataIngresso: true,
  email: true,
  telefone: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ServidorSelect;

export interface EncaminhamentoResumo {
  id: string;
  dataHora: string;
  destinatario: string;
  servidor: string;
  validade: string;
  status: 'Pendente assinatura' | 'Assinado' | 'Expirado';
}

export interface EncaminhamentoCriado extends EncaminhamentoResumo {
  token: string;
}

export async function getServidores(filter?: {
  status?: StatusServidor | 'Todos';
  search?: string;
  role?: Servidor['role'];
}): Promise<Servidor[]> {
  const where: Prisma.ServidorWhereInput = {};

  if (filter?.status && filter.status !== 'Todos') {
    where.status = filter.status;
  }

  if (filter?.role) {
    where.role = filter.role;
  }

  if (filter?.search && filter.search.trim() !== '') {
    const q = filter.search.trim();
    where.OR = [
      { nome: { contains: q, mode: 'insensitive' } },
      { matricula: { contains: q, mode: 'insensitive' } },
      { matriculaCargoEfetivo: { contains: q, mode: 'insensitive' } },
      { cpf: { contains: q, mode: 'insensitive' } },
      { cargoEfetivo: { contains: q, mode: 'insensitive' } },
      { lotacao: { contains: q, mode: 'insensitive' } },
    ];
  }

  const list = await prisma.servidor.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: SERVIDOR_SELECT,
  });

  return list.map((s) => ({
    ...s,
    cpf: formatarCpf(s.cpf),
    fotoUrl: s.fotoStorageKey ? `/api/servidores/${s.id}/foto` : s.fotoUrl ?? '',
    status: s.status as Servidor['status'],
    role: s.role as Servidor['role'],
  }));
}

export async function getServidorById(id: string): Promise<Servidor | null> {
  const s = await prisma.servidor.findFirst({
    where: {
      OR: [{ id }, { matricula: id }],
    },
    select: SERVIDOR_SELECT,
  });

  if (!s) return null;

  return {
    ...s,
    cpf: formatarCpf(s.cpf),
    fotoUrl: s.fotoStorageKey ? `/api/servidores/${s.id}/foto` : s.fotoUrl ?? '',
    status: s.status as Servidor['status'],
    role: s.role as Servidor['role'],
  };
}

export async function addServidor(
  data: Omit<Servidor, 'id'> & {
    role?: Servidor['role'];
    senhaHash?: string;
    senhaDefinidaEm?: Date | null;
  }
): Promise<Servidor> {
  const created = await prisma.servidor.create({
    data: {
      matricula: data.matricula,
      matriculaCargoEfetivo: data.matriculaCargoEfetivo,
      nome: data.nome,
      cpf: formatarCpf(data.cpf),
      fotoUrl: data.fotoUrl || null,
      cargoEfetivo: data.cargoEfetivo,
      cargoOcupado: data.cargoOcupado,
      lotacao: data.lotacao,
      status: data.status,
      role: data.role ?? 'PASTA',
      dataIngresso: data.dataIngresso,
      email: data.email,
      telefone: data.telefone,
      senhaHash: data.senhaHash ?? null,
      ...(data.senhaDefinidaEm !== undefined && { senhaDefinidaEm: data.senhaDefinidaEm }),
    },
    select: SERVIDOR_SELECT,
  });

  return {
    ...created,
    cpf: formatarCpf(created.cpf),
    fotoUrl: created.fotoUrl ?? '',
    status: created.status as Servidor['status'],
    role: created.role as Servidor['role'],
  };
}

export async function updateServidor(
  id: string,
  data: Partial<Omit<Servidor, 'id'>> & { senhaHash?: string },
  auditLog?: Omit<LogAuditoria, 'id' | 'dataHora'>
): Promise<Servidor | null> {
  const updateData = {
    ...(data.matricula !== undefined && { matricula: data.matricula }),
    ...(data.matriculaCargoEfetivo !== undefined && {
      matriculaCargoEfetivo: data.matriculaCargoEfetivo,
    }),
    ...(data.cpf !== undefined && { cpf: formatarCpf(data.cpf) }),
    ...(data.nome !== undefined && { nome: data.nome }),
    ...(data.email !== undefined && { email: data.email }),
    ...(data.telefone !== undefined && { telefone: data.telefone }),
    ...(data.fotoUrl !== undefined && { fotoUrl: data.fotoUrl || null }),
    ...(data.cargoEfetivo !== undefined && { cargoEfetivo: data.cargoEfetivo }),
    ...(data.cargoOcupado !== undefined && { cargoOcupado: data.cargoOcupado }),
    ...(data.lotacao !== undefined && { lotacao: data.lotacao }),
    ...(data.status !== undefined && { status: data.status }),
    ...(data.role !== undefined && { role: data.role }),
    ...(data.dataIngresso !== undefined && { dataIngresso: data.dataIngresso }),
    ...(data.senhaHash !== undefined && { senhaHash: data.senhaHash }),
    ...(data.senhaHash !== undefined && { senhaDefinidaEm: new Date() }),
  };

  const updated = await prisma.$transaction(async (tx) => {
    const servidor = await tx.servidor.update({
      where: { id },
      data: updateData,
      select: SERVIDOR_SELECT,
    });
    if (auditLog) {
      await tx.logAuditoria.create({
        data: {
          operador: auditLog.operador,
          operadorMatricula: auditLog.operadorMatricula,
          acao: auditLog.acao as AcaoAuditoria,
          detalhes: auditLog.detalhes,
          ip: auditLog.ip,
        },
      });
    }
    return servidor;
  });

  return {
    ...updated,
    cpf: formatarCpf(updated.cpf),
    fotoUrl: updated.fotoUrl ?? '',
    status: updated.status as Servidor['status'],
    role: updated.role as Servidor['role'],
  };
}

export async function deleteServidor(
  id: string,
  auditLog?: Omit<LogAuditoria, 'id' | 'dataHora'>
): Promise<Servidor | null> {
  const deleted = await prisma.$transaction(async (tx) => {
    const storageReferences = await tx.servidor.findUnique({
      where: { id },
      select: {
        fotoStorageBackend: true,
        fotoStorageKey: true,
        documentos: { select: { storageBackend: true, storageKey: true, arquivoUrl: true } },
      },
    });
    if (!storageReferences) return null;

    const deletionTasks = [
      {
        backend: storageReferences.fotoStorageBackend ?? 'LOCAL',
        storageKey: storageReferences.fotoStorageKey,
      },
      ...storageReferences.documentos.map((documento) => ({
        backend: documento.storageBackend ?? 'LOCAL',
        storageKey: documento.storageKey ?? documento.arquivoUrl,
      })),
    ].filter((task): task is { backend: StorageBackend; storageKey: string } =>
      Boolean(task.storageKey)
    );

    if (deletionTasks.length) {
      await tx.storageDeletionTask.createMany({ data: deletionTasks, skipDuplicates: true });
    }
    const servidor = await tx.servidor.delete({
      where: { id },
      select: SERVIDOR_SELECT,
    });
    if (auditLog) {
      await tx.logAuditoria.create({
        data: {
          operador: auditLog.operador,
          operadorMatricula: auditLog.operadorMatricula,
          acao: auditLog.acao as AcaoAuditoria,
          detalhes: auditLog.detalhes,
          ip: auditLog.ip,
        },
      });
    }
    return servidor;
  });

  if (!deleted) return null;

  return {
    ...deleted,
    fotoUrl: deleted.fotoUrl ?? '',
    status: deleted.status as Servidor['status'],
    role: deleted.role as Servidor['role'],
  };
}

export async function getFotoServidorById(id: string): Promise<{
  fotoUrl: string | null;
  fotoStorageBackend: StorageBackend | null;
  fotoStorageKey: string | null;
  fotoMimeType: string | null;
} | null> {
  return prisma.servidor.findUnique({
    where: { id },
    select: {
      fotoUrl: true,
      fotoStorageBackend: true,
      fotoStorageKey: true,
      fotoMimeType: true,
    },
  });
}

export async function updateFotoServidor(
  id: string,
  data: {
    fotoUrl?: string | null;
    fotoStorageBackend?: StorageBackend | null;
    fotoStorageKey?: string | null;
    fotoMimeType?: string | null;
  }
): Promise<void> {
  await prisma.servidor.update({ where: { id }, data });
}

const CATEGORIA_ENUM: Record<DocumentoPDF['categoria'], CategoriaDocumento> = {
  'Pasta Física Digitalizada': 'Pasta_Fisica_Digitalizada',
  'Posse Eletrônica': 'Posse_Eletronica',
  'Documentos Pessoais': 'Documentos_Pessoais',
  Publicações: 'Publicacoes',
  'Certidões/Declarações': 'Certidoes_Declaracoes',
};

const CATEGORIA_DISPLAY = Object.fromEntries(
  Object.entries(CATEGORIA_ENUM).map(([display, en]) => [en, display])
) as Record<CategoriaDocumento, DocumentoPDF['categoria']>;

function mapCategoria(raw: string): DocumentoPDF['categoria'] {
  return (
    CATEGORIA_DISPLAY[raw as CategoriaDocumento] ??
    (raw.replace(/_/g, ' ') as DocumentoPDF['categoria'])
  );
}

function mapDocumento(
  documento: Omit<DocumentoPDF, 'categoria' | 'processoSEI' | 'arquivoUrl'> & {
    categoria: string;
    processoSEI: string | null;
    arquivoUrl: string;
    encaminhamentos?: { token: string; assinadoEm: Date | null }[];
  }
): DocumentoPDF {
  const { encaminhamentos, ...dadosDocumento } = documento;
  const assinatura = encaminhamentos?.[0];

  return {
    ...dadosDocumento,
    categoria: mapCategoria(documento.categoria),
    processoSEI: documento.processoSEI ?? undefined,
    arquivoUrl: `/api/documentos/${documento.id}/arquivo`,
    assinatura:
      assinatura?.assinadoEm === null || !assinatura
        ? undefined
        : { token: assinatura.token, assinadoEm: assinatura.assinadoEm.toISOString() },
  };
}

export async function getDocumentosByServidor(servidorId: string): Promise<DocumentoPDF[]> {
  const docs = await prisma.documentoPDF.findMany({
    where: { servidorId },
    orderBy: [{ ordem: 'asc' }, { createdAt: 'desc' }],
    include: {
      encaminhamentos: {
        where: { assinadoEm: { not: null } },
        orderBy: { assinadoEm: 'desc' },
        take: 1,
        select: { token: true, assinadoEm: true },
      },
    },
  });

  return docs.map(mapDocumento);
}

export async function reordenarDocumentosDoServidor(
  servidorId: string,
  documentoIds: string[]
): Promise<boolean> {
  const documentos = await prisma.documentoPDF.findMany({
    where: { servidorId },
    select: { id: true },
  });

  if (
    documentos.length !== documentoIds.length ||
    new Set(documentoIds).size !== documentoIds.length ||
    documentos.some((documento) => !documentoIds.includes(documento.id))
  ) {
    return false;
  }

  await prisma.$transaction(
    documentoIds.map((id, ordem) => prisma.documentoPDF.update({ where: { id }, data: { ordem } }))
  );

  return true;
}

export async function getDocumentoById(id: string): Promise<DocumentoPDF | null> {
  const d = await prisma.documentoPDF.findUnique({
    where: { id },
    include: {
      encaminhamentos: {
        where: { assinadoEm: { not: null } },
        orderBy: { assinadoEm: 'desc' },
        take: 1,
        select: { token: true, assinadoEm: true },
      },
    },
  });
  if (!d) return null;

  return mapDocumento(d);
}

export async function getDocumentoArquivoById(id: string): Promise<{
  titulo: string;
  arquivoUrl: string;
  storageBackend: StorageBackend | null;
  storageKey: string | null;
  assinadoEm: Date | null;
  tokenAssinatura: string | null;
} | null> {
  return prisma.documentoPDF
    .findUnique({
      where: { id },
      select: {
        titulo: true,
        arquivoUrl: true,
        storageBackend: true,
        storageKey: true,
        encaminhamentos: {
          where: { assinadoEm: { not: null } },
          orderBy: { assinadoEm: 'desc' },
          take: 1,
          select: { assinadoEm: true, token: true },
        },
      },
    })
    .then((documento) => {
      if (!documento) return null;
      const { encaminhamentos, ...arquivo } = documento;
      return {
        ...arquivo,
        assinadoEm: encaminhamentos[0]?.assinadoEm ?? null,
        tokenAssinatura: encaminhamentos[0]?.token ?? null,
      };
    });
}

export async function updateDocumento(
  id: string,
  data: Pick<DocumentoPDF, 'titulo' | 'categoria'> & { processoSEI?: string }
): Promise<DocumentoPDF | null> {
  const documento = await prisma.documentoPDF.update({
    where: { id },
    data: {
      titulo: data.titulo,
      categoria: mapCategoriaToEnum(data.categoria),
      processoSEI: data.processoSEI || null,
    },
  });

  return mapDocumento(documento);
}

export async function deleteDocumento(id: string): Promise<{
  titulo: string;
  arquivoUrl: string;
  storageBackend: StorageBackend | null;
  storageKey: string | null;
} | null> {
  const documento = await prisma.$transaction(async (tx) => {
    const existing = await tx.documentoPDF.findUnique({
      where: { id },
      select: { titulo: true, arquivoUrl: true, storageBackend: true, storageKey: true },
    });
    if (!existing) return null;
    await tx.storageDeletionTask.create({
      data: {
        backend: existing.storageBackend ?? 'LOCAL',
        storageKey: existing.storageKey ?? existing.arquivoUrl,
      },
    });
    await tx.documentoPDF.delete({ where: { id } });
    return existing;
  });

  return documento;
}

function mapCategoriaToEnum(categoria: DocumentoPDF['categoria']): CategoriaDocumento {
  return CATEGORIA_ENUM[categoria] ?? (categoria.replace(/ /g, '_') as CategoriaDocumento);
}

export async function addDocumento(docData: NovoDocumentoPDF): Promise<DocumentoPDF> {
  const catEnum = mapCategoriaToEnum(docData.categoria);

  const created = await prisma.$transaction(async (tx) => {
    const documento = await tx.documentoPDF.create({
      data: {
        servidorId: docData.servidorId,
        titulo: docData.titulo,
        categoria: catEnum,
        dataUpload: docData.dataUpload,
        tamanho: docData.tamanho,
        paginas: docData.paginas || 1,
        processoSEI: docData.processoSEI ?? null,
        arquivoUrl: docData.arquivoUrl,
        storageBackend: docData.storageBackend.toUpperCase() as StorageBackend,
        storageKey: docData.storageKey,
        operadorRH: docData.operadorRH,
      },
    });
    return documento;
  });

  return mapDocumento(created);
}

export async function getTodosDocumentos(): Promise<DocumentoPDF[]> {
  const docs = await prisma.documentoPDF.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return docs.map(mapDocumento);
}

function formatarDataHora(data: Date): string {
  return `${data.toLocaleDateString('pt-BR')} ${data.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function mapEncaminhamentoResumo(encaminhamento: {
  id: string;
  destinatario: string;
  validadeDias: number;
  dataGeracao: Date;
  dataExpiracao: Date;
  assinadoEm: Date | null;
  servidor: { nome: string; matricula: string };
}): EncaminhamentoResumo {
  const status = encaminhamento.assinadoEm
    ? 'Assinado'
    : encaminhamento.dataExpiracao <= new Date()
    ? 'Expirado'
    : 'Pendente assinatura';

  return {
    id: encaminhamento.id,
    dataHora: formatarDataHora(encaminhamento.dataGeracao),
    destinatario: encaminhamento.destinatario,
    servidor: `${encaminhamento.servidor.nome} (Mat. ${encaminhamento.servidor.matricula})`,
    validade: `${encaminhamento.dataExpiracao.toLocaleDateString('pt-BR')} (${
      encaminhamento.validadeDias
    } ${encaminhamento.validadeDias === 1 ? 'Dia' : 'Dias'})`,
    status,
  };
}

export async function getEncaminhamentos(): Promise<EncaminhamentoResumo[]> {
  const encaminhamentos = await prisma.encaminhamento.findMany({
    include: { servidor: { select: { nome: true, matricula: true } } },
    orderBy: { dataGeracao: 'desc' },
  });

  return encaminhamentos.map(mapEncaminhamentoResumo);
}

export async function addEncaminhamento(data: {
  servidorId: string;
  documentoId?: string;
  validadeDias: number;
  token: string;
  operador: string;
  operadorMatricula: string;
  ip: string;
}): Promise<EncaminhamentoCriado> {
  const dataExpiracao = new Date();
  dataExpiracao.setDate(dataExpiracao.getDate() + data.validadeDias);

  const encaminhamento = await prisma.$transaction(async (tx) => {
    if (!data.documentoId) {
      throw new Error('Selecione um documento para solicitar a assinatura.');
    }

    const documento = await tx.documentoPDF.findFirst({
      where: { id: data.documentoId, servidorId: data.servidorId },
      select: { id: true },
    });

    if (!documento) {
      throw new Error('Documento não encontrado para o servidor informado.');
    }

    const created = await tx.encaminhamento.create({
      data: {
        servidorId: data.servidorId,
        documentoId: data.documentoId,
        destinatario: 'Servidor titular da pasta',
        validadeDias: data.validadeDias,
        requerSenha: false,
        token: data.token,
        dataExpiracao,
      },
      include: { servidor: { select: { nome: true, matricula: true } } },
    });

    await tx.logAuditoria.create({
      data: {
        operador: data.operador,
        operadorMatricula: data.operadorMatricula,
        acao: 'ENCAMINHAMENTO',
        detalhes: `Solicitou assinatura eletrônica interna de ${created.servidor.nome} (Mat. ${created.servidor.matricula}).`,
        ip: data.ip,
      },
    });

    return created;
  });

  return { ...mapEncaminhamentoResumo(encaminhamento), token: encaminhamento.token };
}
