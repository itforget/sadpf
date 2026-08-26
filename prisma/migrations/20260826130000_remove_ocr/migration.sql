ALTER TABLE "documentos_pdf" DROP COLUMN "textoOCR";

UPDATE "logs_auditoria"
SET
  "acao" = 'CONSULTA',
  "detalhes" = REPLACE("detalhes", 'OCR', 'conteúdo PDF')
WHERE "acao" = 'PESQUISA_OCR';

CREATE TYPE "AcaoAuditoria_new" AS ENUM (
  'CONSULTA',
  'ATUALIZACAO',
  'EXCLUSAO',
  'UPLOAD',
  'IMPRESSAO',
  'EXPORTACAO',
  'ENCAMINHAMENTO'
);

ALTER TABLE "logs_auditoria"
  ALTER COLUMN "acao" TYPE "AcaoAuditoria_new"
  USING ("acao"::text::"AcaoAuditoria_new");

DROP TYPE "AcaoAuditoria";
ALTER TYPE "AcaoAuditoria_new" RENAME TO "AcaoAuditoria";
