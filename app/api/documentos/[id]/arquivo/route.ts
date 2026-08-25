import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedSession } from '@/lib/server/access';
import { getDocumentoArquivoById } from '@/lib/server/db';
import { getStorage } from '@/lib/storage';

export async function GET(
  request: NextRequest,
  context: RouteContext<'/api/documentos/[id]/arquivo'>
) {
  const session = await getVerifiedSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const documento = await getDocumentoArquivoById(id);
    if (!documento) {
      return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 });
    }

    const storage = getStorage(documento.storageBackend ?? 'local');
    const arquivo = await storage.download(documento.storageKey ?? documento.arquivoUrl);
    const nomeArquivo = documento.titulo.replace(/[\r\n"]/g, '_');

    return new NextResponse(new Uint8Array(arquivo), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${nomeArquivo}"`,
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[GET /api/documentos/[id]/arquivo]', error);
    return NextResponse.json({ error: 'Não foi possível abrir o documento.' }, { status: 500 });
  }
}
