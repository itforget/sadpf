import { NextResponse } from 'next/server';
import { pesquisarOCR, getDocumentoById } from '@/lib/server/db';
import { getVerifiedSession } from '@/lib/server/access';
import { checkRateLimit } from '@/lib/server/rate-limit';

export async function GET(request: Request) {
  const session = await getVerifiedSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }
  const rateLimit = checkRateLimit(`search:${session.id}`, 60, 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Muitas pesquisas. Tente novamente em instantes.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
    );
  }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const q = (searchParams.get('q') || '').trim().slice(0, 200);

  if (id) {
    const doc = await getDocumentoById(id);
    return NextResponse.json(doc ? [doc] : []);
  }

  const resultados = await pesquisarOCR(q);
  return NextResponse.json(resultados);
}
