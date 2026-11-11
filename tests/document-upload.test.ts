import assert from 'node:assert/strict';
import test from 'node:test';
import { signedUploadSchema, completeUploadSchema } from '../lib/server/document-upload';
import { documentoSchema } from '../lib/validations/documento';

test('rejeita subcategoria de outra categoria e exige classificação quando há subitens', () => {
  for (const schema of [signedUploadSchema, completeUploadSchema]) {
    const base = { ...metadata, storageKey: 'chave' };
    assert.equal(schema.safeParse({ ...base, subcategoria: 'Nomeação' }).success, false);
    assert.equal(schema.safeParse({ ...base, subcategoria: '' }).success, false);
    assert.equal(schema.safeParse({ ...base, subcategoria: undefined }).success, false);
  }
});

test('categorias sem subitens preservam o fluxo legado sem inventar classificações', () => {
  for (const categoria of ['Pasta Física Digitalizada', 'Posse Eletrônica', 'Outros']) {
    assert.equal(
      signedUploadSchema.safeParse({ ...metadata, categoria, subcategoria: '' }).success,
      true
    );
    assert.equal(
      signedUploadSchema.safeParse({ ...metadata, categoria, subcategoria: 'Nomeação' }).success,
      false
    );
  }
});

const metadata = {
  servidorId: 'servidor-teste',
  titulo: 'Documento de teste',
  categoria: 'Documentos Pessoais' as const,
  subcategoria: 'Cadastro de Pessoa Física (CPF)',
  fileName: 'teste.pdf',
  fileSize: 100,
};

test('assinatura, confirmação e formulário preservam uma subcategoria válida', () => {
  const assinatura = signedUploadSchema.parse(metadata);
  assert.equal(assinatura.subcategoria, metadata.subcategoria);
  const confirmacao = completeUploadSchema.parse({ ...metadata, storageKey: 'chave' });
  assert.equal(confirmacao.subcategoria, metadata.subcategoria);
  const formulario = documentoSchema.parse({
    ...metadata,
    file: new File(['%PDF-1.7'], 'teste.pdf', { type: 'application/pdf' }),
  });
  assert.equal(formulario.subcategoria, metadata.subcategoria);
});
