import { NextResponse } from 'next/server';
import { getAssinaturaEletronica } from '@/lib/server/db';
import { getStorage } from '@/lib/storage';
import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib';

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
    const arquivoComMarca = assinatura.assinadoEm
      ? await adicionarMarcaDagua(arquivo, assinatura.assinadoEm)
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

async function adicionarMarcaDagua(arquivo: Buffer, assinadoEm: Date): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(arquivo, { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const data = assinadoEm.toLocaleString('pt-BR');
  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    page.drawText('ASSINADO ELETRONICAMENTE', {
      x: width * 0.12,
      y: height * 0.42,
      size: Math.min(width / 13, 38),
      font,
      color: rgb(0, 0.3, 0.53),
      opacity: 0.22,
      rotate: degrees(35),
    });
    page.drawText(`SADPF • ${data}`, {
      x: 24,
      y: 18,
      size: 8,
      font,
      color: rgb(0, 0.3, 0.53),
      opacity: 0.8,
    });
  }
  return pdf.save();
}
