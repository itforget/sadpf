import { NextResponse } from 'next/server';
import { getAssinaturaEletronica } from '@/lib/server/db';
import { getStorage } from '@/lib/storage';

export async function GET(
  _request: Request,
  context: RouteContext<'/api/assinaturas/[token]/arquivo'>
) {
  const { token } = await context.params;
  const assinatura = await getAssinaturaEletronica(token);
  if (!assinatura || assinatura.dataExpiracao <= new Date()) {
    return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 404 });
  }
  try {
    const storage = getStorage(assinatura.documento.storageBackend?.toLowerCase() ?? 'local');
    const arquivo = await storage.download(
      assinatura.documento.storageKey ?? assinatura.documento.arquivoUrl
    );
    const nomeArquivo = assinatura.documento.titulo.replace(/[\r\n"]/g, '_');
    return new NextResponse(new Uint8Array(arquivo), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${nomeArquivo}"`,
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[GET /api/assinaturas/[token]/arquivo]', error);
    return NextResponse.json({ error: 'Não foi possível abrir o documento.' }, { status: 500 });
  }
}
