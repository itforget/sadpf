import { prisma } from './prisma';
import type {
  Prisma,
  StatusServidor,
  CategoriaDocumento,
  AcaoAuditoria,
  StorageBackend,
} from '@/prisma/generated';
import type { Servidor, DocumentoPDF, LogAuditoria, NovoDocumentoPDF } from '../types';

const SERVIDOR_SELECT = {
  id: true,
  matricula: true,
  nome: true,
  cpf: true,
  fotoUrl: true,
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
  status: 'Ativo' | 'Expirado';
  justificativa: string;
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
    fotoUrl: s.fotoUrl ?? '',
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
    fotoUrl: s.fotoUrl ?? '',
    status: s.status as Servidor['status'],
    role: s.role as Servidor['role'],
  };
}

export async function addServidor(
  data: Omit<Servidor, 'id'> & { role?: Servidor['role']; senhaHash?: string }
): Promise<Servidor> {
  const created = await prisma.servidor.create({
    data: {
      matricula: data.matricula,
      nome: data.nome,
      cpf: data.cpf,
      fotoUrl: data.fotoUrl || null,
      cargoEfetivo: data.cargoEfetivo,
      cargoOcupado: data.cargoOcupado,
      lotacao: data.lotacao,
      status: data.status === 'Inativo' ? 'Inativo' : 'Ativo',
      role: data.role ?? 'PASTA',
      dataIngresso: data.dataIngresso,
      email: data.email,
      telefone: data.telefone,
      senhaHash: data.senhaHash ?? null,
    },
    select: SERVIDOR_SELECT,
  });

  return {
    ...created,
    fotoUrl: created.fotoUrl ?? '',
    status: created.status as Servidor['status'],
    role: created.role as Servidor['role'],
  };
}

export async function updateServidor(
  id: string,
  data: Partial<Omit<Servidor, 'id'>> & { senhaHash?: string }
): Promise<Servidor | null> {
  const updated = await prisma.servidor.update({
    where: { id },
    data: {
      ...(data.nome !== undefined && { nome: data.nome }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.telefone !== undefined && { telefone: data.telefone }),
      ...(data.cargoEfetivo !== undefined && { cargoEfetivo: data.cargoEfetivo }),
      ...(data.cargoOcupado !== undefined && { cargoOcupado: data.cargoOcupado }),
      ...(data.lotacao !== undefined && { lotacao: data.lotacao }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.role !== undefined && { role: data.role }),
      ...(data.senhaHash !== undefined && { senhaHash: data.senhaHash }),
    },
    select: SERVIDOR_SELECT,
  });

  return {
    ...updated,
    fotoUrl: updated.fotoUrl ?? '',
    status: updated.status as Servidor['status'],
    role: updated.role as Servidor['role'],
  };
}

const CATEGORIA_ENUM: Record<DocumentoPDF['categoria'], CategoriaDocumento> = {
  'Dados Pessoais': 'Dados_Pessoais',
  'Posse e Exercício': 'Posse_e_Exercicio',
  'Vida Funcional': 'Vida_Funcional',
  'Licenças e Afastamentos': 'Licencas_e_Afastamentos',
  'Avaliação de Desempenho': 'Avaliacao_de_Desempenho',
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
  }
): DocumentoPDF {
  return {
    ...documento,
    categoria: mapCategoria(documento.categoria),
    processoSEI: documento.processoSEI ?? undefined,
    arquivoUrl: `/api/documentos/${documento.id}/arquivo`,
  };
}

export async function getDocumentosByServidor(servidorId: string): Promise<DocumentoPDF[]> {
  const docs = await prisma.documentoPDF.findMany({
    where: { servidorId },
    orderBy: { createdAt: 'desc' },
  });

  return docs.map(mapDocumento);
}

export async function getDocumentoById(id: string): Promise<DocumentoPDF | null> {
  const d = await prisma.documentoPDF.findUnique({ where: { id } });
  if (!d) return null;

  return mapDocumento(d);
}

export async function getDocumentoArquivoById(id: string): Promise<{
  titulo: string;
  arquivoUrl: string;
  storageBackend: StorageBackend | null;
  storageKey: string | null;
} | null> {
  return prisma.documentoPDF.findUnique({
    where: { id },
    select: { titulo: true, arquivoUrl: true, storageBackend: true, storageKey: true },
  });
}

function mapCategoriaToEnum(categoria: DocumentoPDF['categoria']): CategoriaDocumento {
  return CATEGORIA_ENUM[categoria] ?? (categoria.replace(/ /g, '_') as CategoriaDocumento);
}

export async function addDocumento(docData: NovoDocumentoPDF): Promise<DocumentoPDF> {
  const catEnum = mapCategoriaToEnum(docData.categoria);

  const created = await prisma.documentoPDF.create({
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
      textoOCR: docData.textoOCR,
      operadorRH: docData.operadorRH,
    },
  });

  return mapDocumento(created);
}

export async function pesquisarOCR(query: string): Promise<DocumentoPDF[]> {
  const q = query.trim();

  if (!q) {
    return getTodosDocumentos();
  }

  const docs = await prisma.documentoPDF.findMany({
    where: {
      OR: [
        { titulo: { contains: q, mode: 'insensitive' } },
        { textoOCR: { contains: q, mode: 'insensitive' } },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });

  return docs.map(mapDocumento);
}

export async function getTodosDocumentos(): Promise<DocumentoPDF[]> {
  const docs = await prisma.documentoPDF.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return docs.map(mapDocumento);
}

export async function getLogs(): Promise<LogAuditoria[]> {
  const logs = await prisma.logAuditoria.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return logs.map((l) => ({
    id: l.id,
    dataHora: `${l.dataHora.toLocaleDateString('pt-BR')} ${l.dataHora.toLocaleTimeString('pt-BR')}`,
    operador: l.operador,
    operadorMatricula: l.operadorMatricula,
    acao: l.acao as LogAuditoria['acao'],
    detalhes: l.detalhes,
    ip: l.ip,
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

function formatarDataHora(data: Date): string {
  return `${data.toLocaleDateString('pt-BR')} ${data.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function mapEncaminhamentoResumo(encaminhamento: {
  id: string;
  destinatario: string;
  justificativa: string;
  validadeDias: number;
  dataGeracao: Date;
  dataExpiracao: Date;
  servidor: { nome: string; matricula: string };
}): EncaminhamentoResumo {
  const expirado = encaminhamento.dataExpiracao <= new Date();

  return {
    id: encaminhamento.id,
    dataHora: formatarDataHora(encaminhamento.dataGeracao),
    destinatario: encaminhamento.destinatario,
    servidor: `${encaminhamento.servidor.nome} (Mat. ${encaminhamento.servidor.matricula})`,
    validade: `${encaminhamento.dataExpiracao.toLocaleDateString('pt-BR')} (${
      encaminhamento.validadeDias
    } ${encaminhamento.validadeDias === 1 ? 'Dia' : 'Dias'})`,
    status: expirado ? 'Expirado' : 'Ativo',
    justificativa: encaminhamento.justificativa,
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
  destinatario: string;
  justificativa: string;
  validadeDias: number;
  requerSenha: boolean;
  token: string;
  operador: string;
  operadorMatricula: string;
  ip: string;
}): Promise<EncaminhamentoCriado> {
  const dataExpiracao = new Date();
  dataExpiracao.setDate(dataExpiracao.getDate() + data.validadeDias);

  const encaminhamento = await prisma.$transaction(async (tx) => {
    if (data.documentoId) {
      const documento = await tx.documentoPDF.findFirst({
        where: { id: data.documentoId, servidorId: data.servidorId },
        select: { id: true },
      });

      if (!documento) {
        throw new Error('Documento não encontrado para o servidor informado.');
      }
    }

    const created = await tx.encaminhamento.create({
      data: {
        servidorId: data.servidorId,
        documentoId: data.documentoId ?? null,
        destinatario: data.destinatario,
        justificativa: data.justificativa,
        validadeDias: data.validadeDias,
        requerSenha: data.requerSenha,
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
        detalhes: `Gerou link seguro de encaminhamento para '${data.destinatario}' referente à pasta de ${created.servidor.nome} (Mat. ${created.servidor.matricula}). Motivo: ${data.justificativa}`,
        ip: data.ip,
      },
    });

    return created;
  });

  return { ...mapEncaminhamentoResumo(encaminhamento), token: encaminhamento.token };
}
