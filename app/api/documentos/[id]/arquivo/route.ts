import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedSession } from '@/lib/server/access';
import { getDocumentoArquivoById } from '@/lib/server/db';
import { getStorage } from '@/lib/storage';
import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib';

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

    const arquivoComMarca = documento.assinadoEm
      ? await adicionarMarcaDagua(arquivo, documento.assinadoEm)
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
    console.error('[GET /api/documentos/[id]/arquivo]', error);
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
