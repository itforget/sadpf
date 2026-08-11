export interface Servidor {
  id: string;
  matricula: string;
  nome: string;
  cpf: string;
  fotoUrl: string;
  cargoEfetivo: string;
  cargoOcupado: string;
  lotacao: string;
  status: 'Ativo' | 'Inativo';
  role: 'ADMIN' | 'OPERADOR' | 'PASTA';
  senhaHash?: string;
  dataIngresso: string;
  email: string;
  telefone: string;
}

export interface DocumentoPDF {
  id: string;
  servidorId: string;
  titulo: string;
  categoria:
    | 'Dados Pessoais'
    | 'Posse e Exercício'
    | 'Vida Funcional'
    | 'Licenças e Afastamentos'
    | 'Avaliação de Desempenho';
  dataUpload: string;
  tamanho: string;
  paginas: number;
  processoSEI?: string;
  arquivoUrl: string;
  textoOCR: string;
  operadorRH: string;
}

export interface LogAuditoria {
  id: string;
  dataHora: string;
  operador: string;
  operadorMatricula: string;
  acao: 'CONSULTA' | 'UPLOAD' | 'IMPRESSAO' | 'EXPORTACAO' | 'ENCAMINHAMENTO' | 'PESQUISA_OCR';
  detalhes: string;
  ip: string;
}
