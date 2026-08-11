import { NextResponse } from 'next/server';
import { pesquisarOCR, getDocumentoById } from '@/lib/server/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const q = searchParams.get('q') || '';

  if (id) {
    const doc = await getDocumentoById(id);
    return NextResponse.json(doc ? [doc] : []);
  }

  const resultados = await pesquisarOCR(q);
  return NextResponse.json(resultados);
}
