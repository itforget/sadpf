import type { DocumentoPDF, LogAuditoria, Servidor, ServidorComDocumentos } from '@/lib/types';
import type {
  ConfiguracoesSummary,
  DashboardSummary,
  RelatoriosSummary,
} from '@/lib/summary-types';

type FetchOptions = RequestInit & {
  cache?: RequestCache;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string } | null;
    return payload?.error || `Erro na requisição (${response.status})`;
  } catch {
    return `Erro na requisição (${response.status})`;
  }
}

export async function fetchJson<T>(input: RequestInfo | URL, init?: FetchOptions): Promise<T> {
  const response = await fetch(input, {
    cache: 'no-store',
    ...init,
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function fetchBlob(input: RequestInfo | URL, init?: FetchOptions): Promise<Blob> {
  const response = await fetch(input, {
    cache: 'no-store',
    ...init,
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  return await response.blob();
}

export interface SessionUser {
  id: string;
  nome: string;
  matricula: string;
  email: string;
  fotoUrl: string;
  role: Servidor['role'];
}

export interface SessionResponse {
  authenticated: boolean;
  user: SessionUser | null;
}

export interface ServidoresFilters {
  status?: 'Ativo' | 'Inativo' | 'Aposentado' | 'Todos';
  search?: string;
  role?: Servidor['role'];
}

export interface Encaminhamento {
  id: string;
  dataHora: string;
  destinatario: string;
  servidor: string;
  validade: string;
  status: 'Pendente assinatura' | 'Assinado' | 'Expirado';
}

export type DocumentoSearchResult = DocumentoPDF;
export type LogResult = LogAuditoria;

export async function fetchSession(): Promise<SessionResponse> {
  return fetchJson<SessionResponse>('/api/auth/session');
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  return fetchJson<DashboardSummary>('/api/dashboard');
}

export async function fetchRelatoriosSummary(): Promise<RelatoriosSummary> {
  return fetchJson<RelatoriosSummary>('/api/relatorios/resumo');
}

export async function fetchConfiguracoesSummary(): Promise<ConfiguracoesSummary> {
  return fetchJson<ConfiguracoesSummary>('/api/configuracoes/resumo');
}

export async function fetchServidorProfile(id: string): Promise<ServidorComDocumentos> {
  return fetchJson<ServidorComDocumentos>(`/api/servidores/${id}`);
}

export async function fetchServidores(filters: ServidoresFilters = {}): Promise<Servidor[]> {
  const url = new URL('/api/servidores', window.location.origin);
  if (filters.status && filters.status !== 'Todos') url.searchParams.set('status', filters.status);
  if (filters.search) url.searchParams.set('search', filters.search);
  if (filters.role) url.searchParams.set('role', filters.role);
  return fetchJson<Servidor[]>(url);
}

export async function fetchServidoresAtivos(): Promise<Servidor[]> {
  return fetchServidores({ status: 'Ativo' });
}

export async function fetchEncaminhamentos(): Promise<Encaminhamento[]> {
  return fetchJson<Encaminhamento[]>('/api/encaminhamentos');
}

export async function fetchLogs(): Promise<LogResult[]> {
  return fetchJson<LogResult[]>('/api/logs');
}

export async function fetchDocumentoById(id: string): Promise<DocumentoSearchResult | null> {
  return fetchJson<DocumentoSearchResult | null>(`/api/documentos/${id}`);
}
