import { promises as fs } from 'fs';
import { join } from 'path';

import { prisma } from './prisma';
import { getServidores, getTodosDocumentos } from './db';
import { CATEGORIAS_DOCUMENTO } from '@/lib/documentos';
import type {
  DashboardSummary,
  ConfiguracoesSummary,
  RelatoriosSummary,
} from '@/lib/summary-types';

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}min`;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

async function getStorageStats() {
  if ((process.env.STORAGE_PROVIDER || 'local').toLowerCase() !== 'local') {
    return { count: 0, bytes: 0, measured: false };
  }

  const uploadDir = join(process.cwd(), 'storage', 'uploads');
  let count = 0;
  let bytes = 0;

  async function visit(directory: string) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(path);
      } else if (entry.isFile()) {
        const stat = await fs.stat(path);
        count += 1;
        bytes += stat.size;
      }
    }
  }

  try {
    await visit(uploadDir);
  } catch {}

  return { count, bytes, measured: true };
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [servidores, documentos] = await Promise.all([getServidores(), getTodosDocumentos()]);
  const servidoresAtivos = servidores.filter((s) => s.status === 'Ativo').length;
  const servidoresInativos = servidores.filter((s) => s.status === 'Inativo').length;
  const servidoresAposentados = servidores.filter((s) => s.status === 'Aposentado').length;
  const servidoresPorId = new Map(servidores.map((servidor) => [servidor.id, servidor]));
  const volumePorServidor = new Map<string, number>();

  for (const documento of documentos) {
    volumePorServidor.set(
      documento.servidorId,
      (volumePorServidor.get(documento.servidorId) ?? 0) + 1
    );
  }

  return {
    servidoresAtivos,
    servidoresInativos,
    servidoresAposentados,
    totalPastasFuncionais: servidores.length,
    ultimasInsercoes: documentos.slice(0, 5).map((documento) => ({
      id: documento.id,
      titulo: documento.titulo,
      categoria: documento.categoria,
      dataUpload: documento.dataUpload,
      servidorId: documento.servidorId,
      servidorNome: servidoresPorId.get(documento.servidorId)?.nome ?? 'Servidor não encontrado',
    })),
    volumePorServidor: Array.from(volumePorServidor.entries())
      .map(([servidorId, quantidade]) => ({
        servidorId,
        servidorNome: servidoresPorId.get(servidorId)?.nome ?? 'Servidor não encontrado',
        documentos: quantidade,
      }))
      .sort((a, b) => b.documentos - a.documentos || a.servidorNome.localeCompare(b.servidorNome))
      .slice(0, 5),
  };
}

export async function getRelatoriosSummary(): Promise<RelatoriosSummary> {
  const [servidores, documentos] = await Promise.all([getServidores(), getTodosDocumentos()]);

  const totalServidores = servidores.length;
  const servidoresComPasta = new Set(documentos.map((d) => d.servidorId)).size;
  const totalDocumentos = documentos.length;
  const totalPaginas = documentos.reduce((soma, d) => soma + (d.paginas || 1), 0);
  const cobertura =
    totalServidores > 0 ? Math.round((servidoresComPasta / totalServidores) * 100) : 0;
  const servidoresAtivos = servidores.filter((s) => s.status === 'Ativo').length;
  const servidoresInativos = servidores.filter((s) => s.status === 'Inativo').length;
  const mediaDocsPorServidor = totalServidores > 0 ? totalDocumentos / totalServidores : 0;
  const mediaPaginasPorDocumento = totalDocumentos > 0 ? totalPaginas / totalDocumentos : 0;
  const totalServidoresSemPasta = totalServidores - servidoresComPasta;

  const categorias = CATEGORIAS_DOCUMENTO;

  const categoriaResumo = categorias.map((categoria) => ({
    categoria,
    quantidade: documentos.filter((d) => d.categoria === categoria).length,
  }));

  const documentosPorLotacao = new Map<string, number>();
  const documentosPorServidor = new Map<string, { quantidade: number; paginas: number }>();
  for (const documento of documentos) {
    const servidor = servidores.find((s) => s.id === documento.servidorId);
    const lotacao = servidor?.lotacao?.trim() || 'Lotação não informada';
    documentosPorLotacao.set(lotacao, (documentosPorLotacao.get(lotacao) ?? 0) + 1);

    const atual = documentosPorServidor.get(documento.servidorId) ?? { quantidade: 0, paginas: 0 };
    atual.quantidade += 1;
    atual.paginas += documento.paginas || 1;
    documentosPorServidor.set(documento.servidorId, atual);
  }

  const lotacaoResumo = Array.from(documentosPorLotacao.entries())
    .map(([lotacao, quantidade]) => ({ lotacao, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 5);

  const topServidores = Array.from(documentosPorServidor.entries())
    .map(([servidorId, info]) => ({
      servidor: servidores.find((s) => s.id === servidorId)!,
      quantidade: info.quantidade,
      paginas: info.paginas,
    }))
    .filter((item) => Boolean(item.servidor))
    .sort((a, b) => b.quantidade - a.quantidade || b.paginas - a.paginas)
    .slice(0, 5);

  const topCategoria =
    categoriaResumo
      .filter((item) => item.quantidade > 0)
      .sort((a, b) => b.quantidade - a.quantidade)[0]?.categoria ?? 'Nenhuma';
  const topLotacao = lotacaoResumo[0]?.lotacao ?? 'Nenhuma';

  return {
    totalServidores,
    servidoresComPasta,
    totalDocumentos,
    totalPaginas,
    cobertura,
    servidoresAtivos,
    servidoresInativos,
    mediaDocsPorServidor,
    mediaPaginasPorDocumento,
    categoriaResumo,
    lotacaoResumo,
    topServidores,
    topLotacao,
    topCategoria,
    totalServidoresSemPasta,
  };
}

export async function getConfiguracoesSummary(): Promise<ConfiguracoesSummary> {
  const [servidoresCount, documentosCount, logsCount, storage] = await Promise.all([
    prisma.servidor.count(),
    prisma.documentoPDF.count(),
    prisma.logAuditoria.count(),
    getStorageStats(),
  ]);

  return {
    dbOk: true,
    servidoresCount,
    documentosCount,
    logsCount,
    storage,
    secretConfigurado: Boolean(process.env.SADPF_SECRET || process.env.NEXTAUTH_SECRET),
    ambiente: process.env.NODE_ENV,
    uptime: formatUptime(process.uptime()),
  };
}
