import type { AUTH_POLICY } from './auth-policy';
import type { DocumentoPDF, Servidor } from './types';

export type DashboardSummary = {
  servidoresAtivos: number;
  servidoresInativos: number;
  servidoresAposentados: number;
  totalPastasFuncionais: number;
  ultimasInsercoes: {
    id: string;
    titulo: string;
    categoria: DocumentoPDF['categoria'];
    dataUpload: string;
    servidorId: string;
    servidorNome: string;
  }[];
  volumePorServidor: { servidorId: string; servidorNome: string; documentos: number }[];
};

export type RelatoriosCategoriaResumo = {
  categoria: DocumentoPDF['categoria'];
  quantidade: number;
};

export type RelatoriosLotacaoResumo = {
  lotacao: string;
  quantidade: number;
};

export type RelatoriosServidorResumo = {
  servidor: Servidor;
  quantidade: number;
  paginas: number;
};

export type RelatoriosSummary = {
  totalServidores: number;
  servidoresComPasta: number;
  totalDocumentos: number;
  totalPaginas: number;
  cobertura: number;
  servidoresAtivos: number;
  servidoresInativos: number;
  mediaDocsPorServidor: number;
  mediaPaginasPorDocumento: number;
  categoriaResumo: RelatoriosCategoriaResumo[];
  lotacaoResumo: RelatoriosLotacaoResumo[];
  topServidores: RelatoriosServidorResumo[];
  topLotacao: string;
  topCategoria: string;
  totalServidoresSemPasta: number;
};

export type ConfiguracoesSummary = {
  authPolicy: typeof AUTH_POLICY;
  dbOk: boolean;
  servidoresCount: number;
  documentosCount: number;
  logsCount: number;
  storage: { count: number; bytes: number; measured: boolean };
  secretConfigurado: boolean;
  ambiente: string;
  uptime: string;
};
