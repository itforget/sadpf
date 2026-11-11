import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const migrationName = '20261109120000_add_documento_subcategoria';
const migrationFile = new URL(
  `../prisma/migrations/${migrationName}/migration.sql`,
  import.meta.url
);

/** Executor pontual: usa a conexão já protegida da Vercel, sem exportar credenciais. */
export async function applySubcategoryMigration({
  connectionString = process.env.DATABASE_URL,
  allowLocalTest = false,
} = {}) {
  assert.ok(connectionString, 'DATABASE_URL não configurada.');
  const url = new URL(connectionString);
  const localTest =
    allowLocalTest &&
    ['localhost', '127.0.0.1'].includes(url.hostname) &&
    url.pathname.endsWith('_test');
  const supabase = url.hostname.endsWith('.supabase.co') || url.hostname.endsWith('.supabase.com');
  assert.ok(
    ['postgres:', 'postgresql:'].includes(url.protocol) && (supabase || localTest),
    'Destino deve ser Supabase ou banco local explicitamente descartável.'
  );
  const sql = await readFile(migrationFile, 'utf8');
  const checksum = createHash('sha256').update(sql).digest('hex');
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 15000,
    application_name: 'sadpf-document-subcategory-migration',
  });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '30s'");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext('sadpf:add_documento_subcategoria'))"
    );
    const schema = await client.query(`SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns WHERE table_schema = 'public'
      AND table_name IN ('documentos_pdf', 'servidores')`);
    const expected = {
      documentos_pdf: [
        'id',
        'servidorId',
        'titulo',
        'categoria',
        'dataUpload',
        'arquivoUrl',
        'storageKey',
      ],
      servidores: ['id', 'matricula', 'cpf', 'nome', 'role'],
    };
    for (const [table, columns] of Object.entries(expected)) {
      for (const column of columns)
        assert.ok(
          schema.rows.some((r) => r.table_name === table && r.column_name === column),
          `Schema não corresponde ao SADPF: ${table}.${column}`
        );
    }
    await client.query('LOCK TABLE public.documentos_pdf IN ACCESS EXCLUSIVE MODE');
    const count = Number(
      (await client.query('SELECT count(*) AS n FROM public.documentos_pdf')).rows[0].n
    );
    assert.ok(count <= 50000, 'Volume exige janela de manutenção para verificação de integridade.');
    const snapshot = async () =>
      (
        await client.query(`SELECT count(*)::int AS count,
      md5(COALESCE(string_agg(md5((to_jsonb(d) - 'subcategoria')::text), '' ORDER BY d.id), '')) AS digest
      FROM public.documentos_pdf d`)
      ).rows[0];
    const before = await snapshot();
    const column = schema.rows.find(
      (r) => r.table_name === 'documentos_pdf' && r.column_name === 'subcategoria'
    );
    if (column)
      assert.ok(
        column.data_type === 'text' && column.is_nullable === 'YES',
        'Coluna existente incompatível; nenhuma alteração realizada.'
      );
    else await client.query(sql);
    const actual = (
      await client.query(`SELECT data_type, is_nullable FROM information_schema.columns
      WHERE table_schema='public' AND table_name='documentos_pdf' AND column_name='subcategoria'`)
    ).rows[0];
    assert.deepEqual(actual, { data_type: 'text', is_nullable: 'YES' });
    const after = await snapshot();
    assert.deepEqual(
      after,
      before,
      'Integridade dos documentos não corresponde ao estado anterior.'
    );
    let history = 'absent_requires_baseline';
    const hasHistory = (
      await client.query("SELECT to_regclass('public._prisma_migrations') AS name")
    ).rows[0].name;
    if (hasHistory) {
      const prior = await client.query(
        `SELECT checksum, finished_at FROM public._prisma_migrations
        WHERE migration_name=$1 AND rolled_back_at IS NULL`,
        [migrationName]
      );
      if (prior.rowCount) {
        assert.ok(
          prior.rows.every((r) => r.finished_at && r.checksum === checksum),
          'Histórico da migração exige revisão.'
        );
        history = 'already_recorded';
      } else {
        await client.query(
          `INSERT INTO public._prisma_migrations
          (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
          VALUES ($1,$2,now(),$3,now(),1)`,
          [randomUUID(), checksum, migrationName]
        );
        history = 'recorded';
      }
    }
    await client.query('COMMIT');
    // Somente metadados e hashes: nenhum dado pessoal ou segredo é registrado.
    return {
      migration: migrationName,
      status: column ? 'already_applied' : 'applied',
      host: url.hostname,
      before,
      after,
      column: actual,
      history,
    };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  applySubcategoryMigration()
    .then((result) => console.log('SADPF_MIGRATION_VERIFIED ' + JSON.stringify(result)))
    .catch((error) => {
      console.error('SADPF_MIGRATION_FAILED', error.code || error.name, error.message);
      process.exitCode = 1;
    });
}
