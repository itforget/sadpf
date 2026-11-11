-- Campo opcional: preserva os PDFs existentes sem atribuir uma classificação fictícia.
ALTER TABLE "documentos_pdf" ADD COLUMN "subcategoria" TEXT;
