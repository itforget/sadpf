import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import * as documentos from '../lib/documentos';

const referencia = JSON.parse(
  readFileSync(new URL('./fixtures/classificacao-ssp-df.json', import.meta.url), 'utf8')
);

test('catálogo reproduz as 66 subcategorias do documento SSP-DF, nas categorias corretas', () => {
  const catalogo = (documentos as unknown as { SUBCATEGORIAS_DOCUMENTO: unknown })
    .SUBCATEGORIAS_DOCUMENTO;
  assert.deepEqual(catalogo, referencia);
  assert.equal(Object.values(referencia).flat().length, 66);
});
