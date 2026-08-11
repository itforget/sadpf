import { NextResponse } from 'next/server';
import { clearSessionCookie, getSessionFromToken, getSessionToken } from '@/lib/server/auth';

export async function GET() {
  const token = await getSessionToken();
  const session = getSessionFromToken(token);

  return NextResponse.json({
    authenticated: Boolean(session),
    user: session
      ? {
          id: String(session.id || ''),
          nome: String(session.nome || 'Usuário Autenticado'),
          matricula: String(session.matricula || '000000-0'),
          email: String(session.email || ''),
          role: String(session.role || 'ADMIN'),
        }
      : null,
  });
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  return clearSessionCookie(response);
}
