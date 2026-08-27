import { NextResponse } from 'next/server';
import { getSigningRequest } from '@/lib/server/signature-service';
import { getPdfArtifact } from '@/lib/server/pdf-artifact';

export async function GET(
  request: Request,
  context: RouteContext<'/api/assinaturas/[token]/arquivo'>
) {
  const { token } = await context.params;
  const assinatura = await getSigningRequest(token);
  if (!assinatura || (!assinatura.assinadoEm && assinatura.dataExpiracao <= new Date())) {
    return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 404 });
  }
  try {
    const artifact = await getPdfArtifact({
      ...assinatura.documento,
      token: assinatura.token,
      assinadoEm: assinatura.assinadoEm,
      validationUrl: new URL(`/autenticidade/${assinatura.token}`, request.url).toString(),
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
    console.error('[GET /api/assinaturas/[token]/arquivo]', error);
    return NextResponse.json({ error: 'Não foi possível abrir o documento.' }, { status: 500 });
  }
}
