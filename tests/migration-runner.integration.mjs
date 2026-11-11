import assert from 'node:assert/strict';
import test from 'node:test';
import { Client } from 'pg';

const runner = await import('../scripts/apply-document-subcategory.mjs').catch((error) => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return {};
  throw error;
});

test('migração preserva registros, verifica a coluna e registra histórico sem repetir', async () => {
  assert.equal(
    typeof runner.applySubcategoryMigration,
    'function',
    'Executor seguro da migração ausente'
  );
  const connectionString = process.env.TEST_DATABASE_URL;
  assert.ok(connectionString, 'Use PostgreSQL descartável em TEST_DATABASE_URL');
  const url = new URL(connectionString);
  assert.ok(url.hostname === '127.0.0.1' && url.pathname.endsWith('_test'));
  const c = new Client({ connectionString });
  await c.connect();
  try {
    await c.query(`CREATE TABLE servidores (id text PRIMARY KEY, matricula text, cpf text, nome text, role text);
      CREATE TABLE documentos_pdf (id text PRIMARY KEY, "servidorId" text, titulo text, categoria text, "dataUpload" text, "arquivoUrl" text, "storageKey" text);
      CREATE TABLE _prisma_migrations (id varchar(36) PRIMARY KEY, checksum varchar(64) NOT NULL, finished_at timestamptz, migration_name varchar(255) NOT NULL, logs text, rolled_back_at timestamptz, started_at timestamptz NOT NULL DEFAULT now(), applied_steps_count integer NOT NULL DEFAULT 0);
      INSERT INTO documentos_pdf VALUES ('ficticio', 'teste', 'PDF fictício', 'Documentos_Pessoais', '2026-01-01', 'teste.pdf', 'teste.pdf');`);
    const first = await runner.applySubcategoryMigration({
      connectionString,
      allowLocalTest: true,
    });
    assert.equal(first.status, 'applied');
    assert.equal(first.before.count, 1);
    assert.deepEqual(first.before, first.after);
    assert.equal(first.history, 'recorded');
    const second = await runner.applySubcategoryMigration({
      connectionString,
      allowLocalTest: true,
    });
    assert.equal(second.status, 'already_applied');
    const rows = await c.query('SELECT migration_name FROM _prisma_migrations');
    assert.equal(rows.rowCount, 1);
    assert.equal(
      (await c.query('SELECT subcategoria FROM documentos_pdf')).rows[0].subcategoria,
      null
    );
    await assert.rejects(runner.applySubcategoryMigration({ connectionString }), /Supabase/);
  } finally {
    await c.end();
  }
});
