import { NextResponse } from 'next/server';
import { getSessionToken, getSessionFromToken } from '@/lib/server/auth';
import { getServidores, getTodosDocumentos, addLog } from '@/lib/server/db';
import {
  criarDocumento,
  finalizarDocumento,
  desenharBlocoEstatistica,
  desenharDestaqueVerde,
  desenharTabela,
  type TabelaColuna,
} from '@/lib/server/pdf';
import type { DocumentoPDF, Servidor } from '@/lib/types';

const CATEGORIAS: DocumentoPDF['categoria'][] = [
  'Dados Pessoais',
  'Posse e Exercício',
  'Vida Funcional',
  'Licenças e Afastamentos',
  'Avaliação de Desempenho',
];

export async function GET() {
  try {
    const token = await getSessionToken();
    const session = getSessionFromToken(token);
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const [servidores, documentos] = await Promise.all([getServidores(), getTodosDocumentos()]);

    const totalServidores = servidores.length;
    const totalDocumentos = documentos.length;
    const servidoresComPasta = new Set(documentos.map((d) => d.servidorId)).size;
    const cobertura =
      totalServidores > 0 ? Math.round((servidoresComPasta / totalServidores) * 100) : 0;
    const totalPaginas = documentos.reduce((soma, d) => soma + (d.paginas || 1), 0);

    const distribuicao = CATEGORIAS.map((categoria) => ({
      categoria,
      quantidade: documentos.filter((d) => d.categoria === categoria).length,
    }));

    const servidorPorId = new Map(servidores.map((s) => [s.id, s]));

    const acervoPorServidor = Array.from(
      documentos.reduce((mapa, d) => {
        const atual = mapa.get(d.servidorId) ?? {
          servidorId: d.servidorId,
          documentos: 0,
          paginas: 0,
        };
        atual.documentos += 1;
        atual.paginas += d.paginas || 1;
        mapa.set(d.servidorId, atual);
        return mapa;
      }, new Map<string, { servidorId: string; documentos: number; paginas: number }>())
    )
      .map(([, valor]) => ({
        servidor: servidorPorId.get(valor.servidorId) ?? null,
        qtd: valor.documentos,
        paginas: valor.paginas,
      }))
      .filter((item) => item.servidor)
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 15);

    const data = new Date();
    const dataFmt = data.toLocaleDateString('pt-BR');
    const horaFmt = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const doc = criarDocumento({
      titulo: 'Relatório Sintético de Gestão de Pessoas',
      subtitulo: `Consolidado estatístico do acervo digitalizado • Gerado em ${dataFmt} às ${horaFmt}`,
      secao: 'RELATÓRIO SINTÉTICO',
    });

    desenharDestaqueVerde(
      doc,
      `Cobertura de digitalização: ${cobertura}% — ${servidoresComPasta} de ${totalServidores} servidores com pasta funcional ativa`
    );

    desenharBlocoEstatistica(
      doc,
      'Cobertura de Digitalização',
      `${cobertura}%`,
      `${servidoresComPasta} de ${totalServidores} servidores com pasta digitalizada`
    );

    desenharBlocoEstatistica(
      doc,
      'Volume de Documentos em PDF',
      totalDocumentos.toLocaleString('pt-BR'),
      `${totalPaginas.toLocaleString('pt-BR')} páginas indexadas com OCR para pesquisa de termos`
    );

    desenharBlocoEstatistica(
      doc,
      'Conformidade LGPD',
      '100% Auditado',
      "Todas as impressões e acessos registrados com marca d'água"
    );

    doc.moveDown(1);

    doc
      .fillColor('#0a4d8c')
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('Distribuição do Acervo por Categoria Documental');
    doc.moveDown(0.6);

    if (totalDocumentos > 0) {
      const colunasCategoria: TabelaColuna[] = [
        { rotulo: 'CATEGORIA DOCUMENTAL', largura: 250 },
        { rotulo: 'DOCUMENTOS', largura: 80, alinhamento: 'centro' },
        { rotulo: 'PARTICIPAÇÃO', largura: 100, alinhamento: 'direita' },
      ];

      const linhasCategoria = distribuicao.map((item) => [
        item.categoria,
        item.quantidade.toLocaleString('pt-BR'),
        `${totalDocumentos > 0 ? Math.round((item.quantidade / totalDocumentos) * 100) : 0}%`,
      ]);

      desenharTabela(doc, colunasCategoria, linhasCategoria);
    } else {
      doc
        .fillColor('#6b7280')
        .font('Helvetica')
        .fontSize(9)
        .text(
          'Nenhum documento cadastrado ainda. Anexe documentos às pastas funcionais para gerar a distribuição por categoria.'
        );
    }

    if (acervoPorServidor.length > 0) {
      doc.moveDown(1.6);
      doc
        .fillColor('#0a4d8c')
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('Acervo por Servidor (Maior Volume)');
      doc.moveDown(0.6);

      const colunasAcervo: TabelaColuna[] = [
        { rotulo: 'SERVIDOR', largura: 200 },
        { rotulo: 'MATRÍCULA', largura: 75, alinhamento: 'centro' },
        { rotulo: 'DOCUMENTOS', largura: 75, alinhamento: 'centro' },
        { rotulo: 'PÁGINAS', largura: 75, alinhamento: 'centro' },
      ];

      const linhasAcervo = acervoPorServidor.map((item) => [
        (item.servidor as Servidor).nome,
        (item.servidor as Servidor).matricula,
        item.qtd.toLocaleString('pt-BR'),
        item.paginas.toLocaleString('pt-BR'),
      ]);

      desenharTabela(doc, colunasAcervo, linhasAcervo);
    }

    finalizarDocumento(doc);

    const chunks: Buffer[] = [];
    for await (const chunk of doc) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    const nomeArquivo = `relatorio-sintetico-${dataFmt.replace(/\//g, '-')}.pdf`;

    addLog({
      operador: String(session.nome),
      operadorMatricula: String(session.matricula),
      acao: 'EXPORTACAO',
      detalhes: `Exportou o relatório sintético de gestão de pessoas em PDF (${dataFmt})`,
      ip: '',
    }).catch((err) => console.error('[relatorios/exportar] erro ao registrar log:', err));

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: unknown) {
    console.error('[GET /api/relatorios/exportar]', error);
    return NextResponse.json({ error: 'Erro ao gerar o relatório sintético.' }, { status: 500 });
  }
}
