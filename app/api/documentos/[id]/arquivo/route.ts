import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedSession } from '@/lib/server/access';
import { getDocumentoArquivoById } from '@/lib/server/repositories/documento';
import { getPdfArtifact } from '@/lib/server/pdf-artifact';

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

    const artifact = await getPdfArtifact({
      ...documento,
      token: documento.tokenAssinatura ?? undefined,
      assinadoEm: documento.assinadoEm,
      assinante: documento.assinante,
      validationUrl: documento.tokenAssinatura
        ? new URL(`/autenticidade/${documento.tokenAssinatura}`, request.url).toString()
        : undefined,
    });
    return new NextResponse(Buffer.from(artifact.bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${artifact.fileName}"`,
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[GET /api/documentos/[id]/arquivo]', error);
    return NextResponse.json({ error: 'Não foi possível abrir o documento.' }, { status: 500 });
  }
}
