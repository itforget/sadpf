export const CATEGORIAS_DOCUMENTO = [
  'Pasta Física Digitalizada',
  'Posse Eletrônica',
  'Documentos Pessoais',
  'Publicações',
  'Certidões/Declarações',
  'Processos',
  'Outros',
] as const;

export type CategoriaDocumentoLabel = (typeof CATEGORIAS_DOCUMENTO)[number];
