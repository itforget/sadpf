import { NextResponse } from 'next/server';
import { getDocumentoById, pesquisarOCR } from '@/lib/server/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const documento = await getDocumentoById(id);
      return NextResponse.json(documento ? [documento] : []);
    }
    const q = searchParams.get('q') || '';
    return NextResponse.json(await pesquisarOCR(q));
  } catch (err) {
    console.error('[GET /api/search]', err);
    return NextResponse.json({ error: 'Erro ao pesquisar documentos.' }, { status: 500 });
  }
}
