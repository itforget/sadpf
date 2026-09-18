import type { ServidoresFilters } from './api';

export const queryKeys = {
  session: ['session'] as const,
  dashboard: ['dashboard'] as const,
  relatorios: ['relatorios'] as const,
  configuracoes: ['configuracoes'] as const,
  servidor: (id: string) => ['servidor', id] as const,
  servidores: (filters: ServidoresFilters = {}) => ['servidores', filters] as const,
  servidoresPage: (filters: ServidoresFilters & { page: number }) =>
    ['servidores', 'page', filters] as const,
  logsPage: (filters: { page: number; search: string; action: string }) =>
    ['logs', filters] as const,
  encaminhamentos: ['encaminhamentos'] as const,
  logs: ['logs'] as const,
  documento: (id: string) => ['documento', id] as const,
} as const;

export const summaryQueryKeys = [
  queryKeys.dashboard,
  queryKeys.relatorios,
  queryKeys.configuracoes,
];
