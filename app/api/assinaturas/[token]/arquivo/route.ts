import { NextResponse } from 'next/server';
import { getAssinaturaEletronica } from '@/lib/server/db';
import { getStorage } from '@/lib/storage';
import { adicionarMarcaDaguaDeAssinatura } from '@/lib/server/signature-watermark';

export async function GET(
  request: Request,
  context: RouteContext<'/api/assinaturas/[token]/arquivo'>
) {
  const { token } = await context.params;
  const assinatura = await getAssinaturaEletronica(token);
  if (!assinatura || (!assinatura.assinadoEm && assinatura.dataExpiracao <= new Date())) {
    return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 404 });
  }
  try {
    const storage = getStorage(assinatura.documento.storageBackend?.toLowerCase() ?? 'local');
    const arquivo = await storage.download(
      assinatura.documento.storageKey ?? assinatura.documento.arquivoUrl
    );
    const nomeArquivo = assinatura.documento.titulo.replace(/[\r\n"]/g, '_');
    const arquivoComMarca = assinatura.assinadoEm
      ? await adicionarMarcaDaguaDeAssinatura(
          arquivo,
          assinatura.assinadoEm,
          assinatura.token,
          new URL(`/autenticidade/${assinatura.token}`, request.url).toString()
        )
      : arquivo;
    return new NextResponse(new Uint8Array(arquivoComMarca), {
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
