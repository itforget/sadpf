import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromToken, getSessionToken } from '@/lib/server/auth';
import { getDashboardSummary } from '@/lib/server/summary';

export async function GET(request: NextRequest) {
  const session = getSessionFromToken(await getSessionToken(request));
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  try {
    return NextResponse.json(await getDashboardSummary());
  } catch (error) {
    console.error('[GET /api/dashboard]', error);
    return NextResponse.json({ error: 'Erro ao consultar resumo do painel.' }, { status: 500 });
  }
}
