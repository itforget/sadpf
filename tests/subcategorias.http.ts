import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import { PDFDocument } from 'pdf-lib';
import { prisma } from '../lib/server/prisma';

async function main() {
  const base = process.env.TEST_BASE_URL || 'http://localhost:3097';
  const database = new URL(process.env.DATABASE_URL!);
  assert.ok(
    ['127.0.0.1', 'localhost'].includes(database.hostname) && database.pathname.endsWith('_test')
  );
  assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname));
  const password = randomBytes(24).toString('hex');
  const operador = await prisma.servidor.create({
    data: {
      matricula: `HTTP-${Date.now()}`,
      nome: 'Pessoa Fictícia — Teste de Subcategorias',
      cpf: `http-${Date.now()}`,
      email: `http-${Date.now()}@example.invalid`,
      cargoEfetivo: 'Teste',
      cargoOcupado: '',
      lotacao: 'Ambiente de teste',
      dataIngresso: '2026-01-01',
      telefone: '',
      role: 'OPERADOR',
      senhaHash: await bcrypt.hash(password, 10),
      senhaDefinidaEm: new Date(),
    },
  });
  let cookie = '';
  const ids: string[] = [];
  const api = (path: string, init: RequestInit = {}) =>
    fetch(base + path, {
      ...init,
      headers: { Origin: base, Cookie: cookie, ...init.headers },
    });
  const json = (path: string, body: unknown, method = 'POST') =>
    api(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  try {
    const login = await json('/api/auth/login', { email: operador.email, password });
    assert.equal(login.status, 200);
    cookie = login.headers.get('set-cookie')!.split(';')[0];
    assert.ok(cookie.startsWith('sadpf_session='));
    const metadata = {
      servidorId: operador.id,
      titulo: 'PDF fictício de classificação',
      categoria: 'Documentos Pessoais',
      subcategoria: 'Cadastro de Pessoa Física (CPF)',
      fileName: 'teste.pdf',
      fileSize: 100,
    };
    for (const path of ['/api/upload/assinar', '/api/upload/confirmar']) {
      const expected =
        path.endsWith('/assinar') && process.env.STORAGE_PROVIDER !== 'supabase' ? 409 : 400;
      const invalid = await json(path, {
        ...metadata,
        subcategoria: 'Nomeação',
        storageKey: 'chave',
      });
      assert.equal(invalid.status, expected, path);
      const missing = await json(path, {
        ...metadata,
        subcategoria: undefined,
        storageKey: 'chave',
      });
      assert.equal(missing.status, expected, path);
    }
    const pdf = await PDFDocument.create();
    pdf.addPage();
    const bytes = await pdf.save();
    async function upload(categoria: string, subcategoria?: string) {
      const form = new FormData();
      form.set('file', new File([new Uint8Array(bytes)], 'teste.pdf', { type: 'application/pdf' }));
      form.set('servidorId', operador.id);
      form.set('titulo', 'PDF fictício de classificação');
      form.set('categoria', categoria);
      if (subcategoria !== undefined) form.set('subcategoria', subcategoria);
      return api('/api/upload', { method: 'POST', body: form });
    }
    assert.equal((await upload('Documentos Pessoais', 'Nomeação')).status, 400);
    assert.equal((await upload('Documentos Pessoais')).status, 400);
    const response = await upload(metadata.categoria, metadata.subcategoria);
    assert.equal(response.status, 201, await response.clone().text());
    const documento = await response.json();
    ids.push(documento.id);
    assert.equal(documento.subcategoria, metadata.subcategoria);
    const stored = await (await api(`/api/documentos/${documento.id}`)).json();
    assert.equal(stored.subcategoria, metadata.subcategoria);
    const arquivo = await api(`/api/documentos/${documento.id}/arquivo`);
    assert.equal(arquivo.status, 200);
    assert.deepEqual(new Uint8Array(await arquivo.arrayBuffer()), bytes);
    const edited = await json(
      `/api/documentos/${documento.id}`,
      {
        titulo: metadata.titulo,
        categoria: 'Publicações',
        subcategoria: 'Nomeação',
      },
      'PATCH'
    );
    assert.equal(edited.status, 200);
    assert.equal((await edited.json()).subcategoria, 'Nomeação');
    const invalidPatch = await json(`/api/documentos/${documento.id}`, metadata, 'PATCH');
    assert.equal(invalidPatch.status, 200);
    const rejected = await json(
      `/api/documentos/${documento.id}`,
      {
        ...metadata,
        categoria: 'Publicações',
      },
      'PATCH'
    );
    assert.equal(rejected.status, 400);
    const unchanged = await (await api(`/api/documentos/${documento.id}`)).json();
    assert.equal(unchanged.subcategoria, metadata.subcategoria);
    const legacyResponse = await upload('Pasta Física Digitalizada');
    assert.equal(legacyResponse.status, 201);
    const legado = await legacyResponse.json();
    ids.push(legado.id);
    assert.equal(legado.subcategoria, undefined);
    console.log(
      'HTTP: login real, validação no upload multipart e confirmação, assinatura bloqueada sem Supabase, upload PDF real, download idêntico, PATCH e readback, rejeição sem alteração e compatibilidade legada aprovados.'
    );
    if (process.env.SADPF_TEST_STATE) {
      await writeFile(
        process.env.SADPF_TEST_STATE,
        JSON.stringify({ base, cookie, servidorId: operador.id, documentoIds: ids }),
        { mode: 0o600 }
      );
    }
  } finally {
    if (!process.env.SADPF_TEST_STATE) {
      for (const id of ids) await api(`/api/documentos/${id}`, { method: 'DELETE' });
      await prisma.servidor.delete({ where: { id: operador.id } });
    }
    await prisma.$disconnect();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
