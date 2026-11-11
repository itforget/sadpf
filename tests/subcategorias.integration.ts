import 'dotenv/config';
import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '../lib/server/prisma';
import { addDocumento, getDocumentoById, updateDocumento } from '../lib/server/db';

// Somente banco descartável local, nunca o banco da instituição.
const url = new URL(process.env.DATABASE_URL!);
assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname) && url.pathname.endsWith('_test'));

test('persiste a classificação, permite reclassificar e mantém documentos legados legíveis', async () => {
  const servidor = await prisma.servidor.create({
    data: {
      matricula: `SUBCAT-${Date.now()}`,
      nome: 'Pessoa Fictícia — Teste de Subcategorias',
      cpf: `teste-${Date.now()}`,
      email: `subcat-${Date.now()}@example.invalid`,
      cargoEfetivo: 'Teste',
      cargoOcupado: '',
      lotacao: 'Ambiente de teste',
      dataIngresso: '2026-01-01',
      telefone: '',
    },
  });
  try {
    const input = {
      servidorId: servidor.id,
      titulo: 'PDF fictício',
      categoria: 'Documentos Pessoais' as const,
      subcategoria: 'Cadastro de Pessoa Física (CPF)',
      dataUpload: '09/11/2026',
      tamanho: '0.01 MB',
      paginas: 1,
      arquivoUrl: 'documentos/teste.pdf',
      operadorRH: 'Teste automatizado',
      storageBackend: 'local' as const,
      storageKey: 'documentos/teste.pdf',
    };
    const criado = await addDocumento(input);
    assert.equal((criado as unknown as { subcategoria?: string }).subcategoria, input.subcategoria);
    const lido = await getDocumentoById(criado.id);
    assert.equal((lido as unknown as { subcategoria?: string }).subcategoria, input.subcategoria);
    const alteracao = {
      titulo: input.titulo,
      categoria: 'Publicações' as const,
      subcategoria: 'Nomeação',
    };
    const editado = await updateDocumento(criado.id, alteracao);
    assert.equal((editado as unknown as { subcategoria?: string }).subcategoria, 'Nomeação');
    const legado = await addDocumento({
      ...input,
      categoria: 'Pasta Física Digitalizada',
      subcategoria: undefined,
    });
    assert.equal((legado as unknown as { subcategoria?: string }).subcategoria, undefined);
  } finally {
    await prisma.servidor.delete({ where: { id: servidor.id } });
    await prisma.$disconnect();
  }
});
