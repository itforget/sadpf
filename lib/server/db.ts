import { prisma } from './prisma';
import type { Prisma, StatusServidor, CategoriaDocumento, AcaoAuditoria } from '@/prisma/generated';
import type { Servidor, DocumentoPDF, LogAuditoria } from '../types';

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
  });

  return list.map((s) => ({
    ...s,
    fotoUrl: s.fotoUrl ?? '',
    status: s.status as Servidor['status'],
    role: s.role as Servidor['role'],
    senhaHash: s.senhaHash ?? undefined,
  }));
}

export async function getServidorById(id: string): Promise<Servidor | null> {
  const s = await prisma.servidor.findFirst({
    where: {
      OR: [{ id }, { matricula: id }],
    },
  });

  if (!s) return null;

  return {
    ...s,
    fotoUrl: s.fotoUrl ?? '',
    status: s.status as Servidor['status'],
    role: s.role as Servidor['role'],
    senhaHash: s.senhaHash ?? undefined,
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
  });

  return {
    ...created,
    fotoUrl: created.fotoUrl ?? '',
    status: created.status as Servidor['status'],
    role: created.role as Servidor['role'],
    senhaHash: created.senhaHash ?? undefined,
  };
}

export async function updateServidor(
  id: string,
  data: Partial<Omit<Servidor, 'id'>>
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
  });

  return {
    ...updated,
    fotoUrl: updated.fotoUrl ?? '',
    status: updated.status as Servidor['status'],
    role: updated.role as Servidor['role'],
    senhaHash: updated.senhaHash ?? undefined,
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

export async function getDocumentosByServidor(servidorId: string): Promise<DocumentoPDF[]> {
  const docs = await prisma.documentoPDF.findMany({
    where: { servidorId },
    orderBy: { createdAt: 'desc' },
  });

  return docs.map((d) => ({
    ...d,
    categoria: mapCategoria(d.categoria),
    processoSEI: d.processoSEI ?? undefined,
  }));
}

export async function getDocumentoById(id: string): Promise<DocumentoPDF | null> {
  const d = await prisma.documentoPDF.findUnique({ where: { id } });
  if (!d) return null;

  return {
    ...d,
    categoria: mapCategoria(d.categoria),
    processoSEI: d.processoSEI ?? undefined,
  };
}

function mapCategoriaToEnum(categoria: DocumentoPDF['categoria']): CategoriaDocumento {
  return CATEGORIA_ENUM[categoria] ?? (categoria.replace(/ /g, '_') as CategoriaDocumento);
}

export async function addDocumento(docData: Omit<DocumentoPDF, 'id'>): Promise<DocumentoPDF> {
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
      textoOCR: docData.textoOCR,
      operadorRH: docData.operadorRH,
    },
  });

  return {
    ...created,
    categoria: docData.categoria,
    processoSEI: created.processoSEI ?? undefined,
  };
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

  return docs.map((d) => ({
    ...d,
    categoria: mapCategoria(d.categoria),
    processoSEI: d.processoSEI ?? undefined,
  }));
}

export async function getTodosDocumentos(): Promise<DocumentoPDF[]> {
  const docs = await prisma.documentoPDF.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return docs.map((d) => ({
    ...d,
    categoria: mapCategoria(d.categoria),
    processoSEI: d.processoSEI ?? undefined,
  }));
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
