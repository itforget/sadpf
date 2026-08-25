import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedSession } from '@/lib/server/access';
import { getDashboardSummary } from '@/lib/server/summary';

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
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
