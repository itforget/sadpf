import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromToken, getSessionToken } from '@/lib/server/auth';
import { getConfiguracoesSummary } from '@/lib/server/summary';

export async function GET(request: NextRequest) {
  const session = getSessionFromToken(await getSessionToken(request));
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }
  if (session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
  }

  try {
    return NextResponse.json(await getConfiguracoesSummary());
  } catch (error) {
    console.error('[GET /api/configuracoes/resumo]', error);
    return NextResponse.json(
      { error: 'Erro ao consultar informações de configurações.' },
      { status: 500 }
    );
  }
}
