import { NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { getVerifiedSession } from '@/lib/server/access';
import { getServidorById } from '@/lib/server/repositories/servidor';
import {
  getDocumentosByServidor,
  getDocumentoArquivoById,
} from '@/lib/server/repositories/documento';
import { addLog } from '@/lib/server/repositories/auditoria';
import { getStorage } from '@/lib/storage';
import {
  criarDocumento,
  finalizarDocumento,
  desenharDadosServidor,
  desenharListaDocumentos,
} from '@/lib/server/pdf';
import { getRequestIp } from '@/lib/server/request-ip';

export async function GET(request: Request) {
  try {
    const session = await getVerifiedSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const servidorId = searchParams.get('servidorId');
    const paraImpressao = searchParams.get('modo') === 'imprimir';
    if (!servidorId) {
      return NextResponse.json({ error: 'servidorId é obrigatório.' }, { status: 400 });
    }

    const [servidor, documentos] = await Promise.all([
      getServidorById(servidorId),
      getDocumentosByServidor(servidorId),
    ]);
    if (!servidor) {
      return NextResponse.json({ error: 'Servidor não encontrado.' }, { status: 404 });
    }

    const data = new Date();
    const dataFmt = data.toLocaleDateString('pt-BR');

    const doc = criarDocumento({
      titulo: 'Pasta Funcional Digital',
      subtitulo: `Acervo documental de ${servidor.nome} (Mat. ${servidor.matricula}) • Gerado em ${dataFmt}`,
      secao: 'PASTA FUNCIONAL',
    });

    await desenharDadosServidor(doc, servidor);

    doc.moveDown(0.8);
    doc
      .fillColor('#0a4d8c')
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('Documentos Anexados (Acervo PDF)');
    doc.moveDown(0.6);

    desenharListaDocumentos(doc, documentos);

    finalizarDocumento(doc);

    const chunks: Buffer[] = [];
    for await (const chunk of doc) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const resumoPasta = Buffer.concat(chunks);
    const pastaCompleta = await PDFDocument.create();
    const resumo = await PDFDocument.load(resumoPasta);
    const paginasResumo = await pastaCompleta.copyPages(resumo, resumo.getPageIndices());
    paginasResumo.forEach((pagina) => pastaCompleta.addPage(pagina));

    for (const documento of documentos) {
      const arquivo = await getDocumentoArquivoById(documento.id);
      if (!arquivo) continue;

      const storage = getStorage(arquivo.storageBackend ?? 'local');
      const buffer = await storage.download(arquivo.storageKey ?? arquivo.arquivoUrl);
      const pdfOriginal = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const paginasDocumento = await pastaCompleta.copyPages(
        pdfOriginal,
        pdfOriginal.getPageIndices()
      );
      paginasDocumento.forEach((pagina) => pastaCompleta.addPage(pagina));
    }

    const buffer = Buffer.from(await pastaCompleta.save());

    const nomeArquivo = `pasta-funcional-${servidor.matricula.replace(
      /[^a-zA-Z0-9-]/g,
      ''
    )}-${dataFmt.replace(/\//g, '-')}.pdf`;

    addLog({
      operador: String(session.nome),
      operadorMatricula: String(session.matricula),
      acao: paraImpressao ? 'IMPRESSAO' : 'EXPORTACAO',
      detalhes: `${
        paraImpressao ? 'Abriu para impressão' : 'Exportou'
      } a pasta funcional completa, com ${documentos.length} documento(s), do servidor ${
        servidor.nome
      } (Mat. ${servidor.matricula})`,
      ip: getRequestIp(request),
    }).catch((err) => console.error('[pastas/exportar] erro ao registrar log:', err));

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${
          paraImpressao ? 'inline' : 'attachment'
        }; filename="${nomeArquivo}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: unknown) {
    console.error('[GET /api/pastas/exportar]', error);
    return NextResponse.json({ error: 'Erro ao gerar a pasta funcional em PDF.' }, { status: 500 });
  }
}
