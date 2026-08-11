import { NextResponse } from 'next/server';
import { getSessionToken, getSessionFromToken } from '@/lib/server/auth';
import { getServidorById, getDocumentosByServidor, addLog } from '@/lib/server/db';
import {
  criarDocumento,
  finalizarDocumento,
  desenharDadosServidor,
  desenharListaDocumentos,
} from '@/lib/server/pdf';

export async function GET(request: Request) {
  try {
    const token = await getSessionToken();
    const session = getSessionFromToken(token);
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const servidorId = searchParams.get('servidorId');
    if (!servidorId) {
      return NextResponse.json({ error: 'servidorId é obrigatório.' }, { status: 400 });
    }

    const servidor = await getServidorById(servidorId);
    if (!servidor) {
      return NextResponse.json({ error: 'Servidor não encontrado.' }, { status: 404 });
    }

    const documentos = await getDocumentosByServidor(servidorId);

    const data = new Date();
    const dataFmt = data.toLocaleDateString('pt-BR');

    const doc = criarDocumento({
      titulo: 'Pasta Funcional Digital',
      subtitulo: `Acervo documental de ${servidor.nome} (Mat. ${servidor.matricula}) • Gerado em ${dataFmt}`,
      secao: 'PASTA FUNCIONAL',
    });

    desenharDadosServidor(doc, servidor);

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
    const buffer = Buffer.concat(chunks);

    const nomeArquivo = `pasta-funcional-${servidor.matricula.replace(
      /[^a-zA-Z0-9-]/g,
      ''
    )}-${dataFmt.replace(/\//g, '-')}.pdf`;

    addLog({
      operador: String(session.nome),
      operadorMatricula: String(session.matricula),
      acao: 'EXPORTACAO',
      detalhes: `Exportou a pasta funcional completa em PDF do servidor ${servidor.nome} (Mat. ${servidor.matricula})`,
      ip: '',
    }).catch((err) => console.error('[pastas/exportar] erro ao registrar log:', err));

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: unknown) {
    console.error('[GET /api/pastas/exportar]', error);
    return NextResponse.json({ error: 'Erro ao gerar a pasta funcional em PDF.' }, { status: 500 });
  }
}
