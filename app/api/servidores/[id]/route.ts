import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromToken, getSessionToken } from '@/lib/server/auth';
import { getDocumentosByServidor, getServidorById } from '@/lib/server/db';

export async function GET(request: NextRequest, context: RouteContext<'/api/servidores/[id]'>) {
  const session = getSessionFromToken(await getSessionToken(request));
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const servidor = await getServidorById(id);
    if (!servidor) {
      return NextResponse.json({ error: 'Servidor não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({
      servidor,
      documentos: await getDocumentosByServidor(servidor.id),
    });
  } catch (error) {
    console.error('[GET /api/servidores/[id]]', error);
    return NextResponse.json({ error: 'Erro ao consultar servidor.' }, { status: 500 });
  }
}
