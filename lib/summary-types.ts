import type { DocumentoPDF, Servidor } from './types';

export type DashboardSummary = {
  totalServidores: number;
  servidoresAtivos: number;
  totalDocumentos: number;
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
  dbOk: boolean;
  servidoresCount: number;
  documentosCount: number;
  logsCount: number;
  storage: { count: number; bytes: number };
  secretConfigurado: boolean;
  ambiente: string;
  uptime: string;
};
