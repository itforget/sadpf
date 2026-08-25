import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/server/auth';
import { getVerifiedSession, isSameOriginMutation } from '@/lib/server/access';

export async function GET() {
  const session = await getVerifiedSession();

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

export async function DELETE(request: Request) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: 'Origem da requisição inválida.' }, { status: 403 });
  }
  const response = NextResponse.json({ ok: true });
  return clearSessionCookie(response);
}
