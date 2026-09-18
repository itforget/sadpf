import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import AssinaturaClient from '../app/assinar/[token]/AssinaturaClient';
import { ApiError, fetchJson } from '../lib/client/api';
import { parsePage } from '../lib/pagination';
import { AUTH_POLICY } from '../lib/auth-policy';
import { passwordResetSchema } from '../lib/validations/auth';

const invitation = {
  token: 'test-invitation',
  documento: 'Documento de teste',
  servidor: 'Servidor de teste',
  expiracao: '18/09/2026',
};

test('convite pendente oferece formulário e alternativa ao visualizador PDF', () => {
  const html = renderToStaticMarkup(<AssinaturaClient {...invitation} assinado={false} />);
  assert.match(html, /<form/);
  assert.match(html, /name="cpf"/);
  assert.match(html, /Abrir PDF em outra aba/);
  assert.doesNotMatch(html, /Assinado eletronicamente com sucesso/);
});

test('convite expirado explica recuperação e não permite assinatura', () => {
  const html = renderToStaticMarkup(<AssinaturaClient {...invitation} assinado={false} expirado />);
  assert.match(html, /Solicite um novo convite/);
  assert.doesNotMatch(html, /<form/);
  assert.doesNotMatch(html, /Assinado eletronicamente com sucesso/);
});

test('documento assinado mantém acesso ao PDF e confirma o resultado', () => {
  const html = renderToStaticMarkup(<AssinaturaClient {...invitation} assinado />);
  assert.match(html, /role="status"/);
  assert.match(html, /Assinado eletronicamente com sucesso/);
  assert.match(html, /assinado=true/);
  assert.doesNotMatch(html, /<form/);
});

test('paginação normaliza parâmetros inválidos sem aceitar offsets negativos ou infinitos', () => {
  for (const input of [
    null,
    '',
    '0',
    '-1',
    '1.5',
    'Infinity',
    'NaN',
    'texto',
    '9007199254740992',
  ]) {
    assert.equal(parsePage(input), 1, String(input));
  }
  assert.equal(parsePage('2'), 2);
  assert.equal(parsePage('150'), 150);
});

test('redefinição usa a política exibida e exige confirmação da senha', () => {
  const data = {
    token: 'a'.repeat(32),
    password: 'A'.repeat(AUTH_POLICY.minimumPasswordLength),
    confirmPassword: 'A'.repeat(AUTH_POLICY.minimumPasswordLength),
  };
  assert.equal(passwordResetSchema.safeParse(data).success, true);
  assert.equal(
    passwordResetSchema.safeParse({ ...data, password: data.password.slice(1) }).success,
    false
  );
  assert.equal(
    passwordResetSchema.safeParse({ ...data, confirmPassword: 'diferente' }).success,
    false
  );
});

test('erro de convite expirado preserva status HTTP e mensagem de recuperação', async (context) => {
  context.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(JSON.stringify({ error: 'Este link de assinatura expirou.' }), { status: 410 })
  );
  await assert.rejects(
    fetchJson('/api/assinaturas/test'),
    (error: unknown) =>
      error instanceof ApiError && error.status === 410 && error.message.includes('expirou')
  );
});

test('resposta de erro não JSON produz erro tratável em vez de falhar na leitura da mensagem', async (context) => {
  context.mock.method(
    globalThis,
    'fetch',
    async () => new Response('Gateway indisponível', { status: 502 })
  );
  await assert.rejects(
    fetchJson('/api/assinaturas/test'),
    (error: unknown) => error instanceof ApiError && error.status === 502
  );
});

test('falha de rede é propagada para recuperação pelo formulário', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => {
    throw new TypeError('Failed to fetch');
  });
  await assert.rejects(fetchJson('/api/assinaturas/test'), TypeError);
});
