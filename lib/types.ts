import type { CategoriaDocumentoLabel } from './documentos';

export interface Servidor {
  id: string;
  matricula: string;
  matriculaCargoEfetivo: string;
  nome: string;
  cpf: string;
  fotoUrl: string;
  fotoStorageBackend?: 'local' | 'supabase' | 's3' | 'LOCAL' | 'SUPABASE' | 'S3' | null;
  fotoStorageKey?: string | null;
  fotoMimeType?: string | null;
  cargoEfetivo: string;
  cargoOcupado: string;
  lotacao: string;
  status: 'Ativo' | 'Inativo' | 'Aposentado';
  role: 'ADMIN' | 'OPERADOR' | 'PASTA';
  dataIngresso: string;
  email: string;
  telefone: string;
}

export interface DocumentoPDF {
  id: string;
  servidorId: string;
  titulo: string;
  categoria: CategoriaDocumentoLabel;
  dataUpload: string;
  tamanho: string;
  paginas: number;
  processoSEI?: string;
  arquivoUrl: string;
  textoOCR: string;
  operadorRH: string;
}

export interface ServidorComDocumentos {
  servidor: Servidor;
  documentos: DocumentoPDF[];
}

export interface NovoDocumentoPDF extends Omit<DocumentoPDF, 'id'> {
  storageBackend: 'local' | 'supabase' | 's3';
  storageKey: string;
}

export interface LogAuditoria {
  id: string;
  dataHora: string;
  operador: string;
  operadorMatricula: string;
  acao:
    | 'CONSULTA'
    | 'ATUALIZACAO'
    | 'EXCLUSAO'
    | 'UPLOAD'
    | 'IMPRESSAO'
    | 'EXPORTACAO'
    | 'ENCAMINHAMENTO'
    | 'PESQUISA_OCR';
  detalhes: string;
  ip: string;
}
