ALTER TABLE "encaminhamentos"
  ADD COLUMN "assinadoEm" TIMESTAMP(3),
  ADD COLUMN "assinadoIp" TEXT;

CREATE INDEX "encaminhamentos_assinadoEm_idx" ON "encaminhamentos"("assinadoEm");
