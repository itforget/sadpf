import PDFDocument from 'pdfkit';
import { readFile } from 'fs/promises';
import { join, normalize } from 'path';
import type { Servidor, DocumentoPDF } from '@/lib/types';
import { getStorage } from '@/lib/storage';

const AZUL_SSP = '#0a4d8c';
const AZUL_ESCURO = '#083b6b';
const TEXTO = '#1f2937';
const MUTED = '#6b7280';
const BORDA = '#cbd5e1';
const FUNDO_LINHA = '#f1f5f9';
const DESTAQUE = '#059669';

interface DocumentoPDFOptions {
  titulo: string;
  subtitulo: string;
  secao?: string;
}

function desenharCabecalho(
  doc: PDFKit.PDFDocument,
  { titulo, subtitulo, secao }: DocumentoPDFOptions
): void {
  const largura = doc.page.width;

  doc.rect(0, 0, largura, 96).fill(AZUL_SSP);
  doc.rect(0, 96, largura, 5).fill(AZUL_ESCURO);

  doc
    .fillColor('#ffffff')
    .font('Helvetica-Bold')
    .fontSize(8)
    .text('SECRETARIA DE ESTADO DE SEGURANÇA PÚBLICA DO DF', 55, 16, {
      width: largura - 110,
      lineBreak: false,
    });

  doc.fontSize(16).text(titulo, 55, 34, { width: largura - 110, lineBreak: false });

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#dbeafe')
    .text(subtitulo, 55, 60, { width: largura - 110 });

  doc
    .rect(largura - 175, 22, 120, 52)
    .fill(AZUL_ESCURO)
    .strokeColor(AZUL_ESCURO)
    .stroke();

  doc
    .fillColor('#ffffff')
    .font('Helvetica-Bold')
    .fontSize(7)
    .text('PASTA FUNCIONAL DIGITAL', largura - 175, 32, { width: 120, align: 'center' });
  doc
    .font('Helvetica')
    .fontSize(6.5)
    .text('USO EXCLUSIVO RH / LGPD', largura - 175, 46, { width: 120, align: 'center' });
  if (secao) {
    doc
      .font('Helvetica-Bold')
      .fontSize(6.5)
      .text(secao, largura - 175, 60, { width: 120, align: 'center' });
  }

  doc.fillColor(TEXTO);
  doc.y = 130;
}

function desenharRodape(doc: PDFKit.PDFDocument, paginaAtual: number, totalPaginas: number): void {
  const largura = doc.page.width;
  const rodapeY = doc.page.height - 42;

  doc
    .strokeColor(BORDA)
    .lineWidth(0.6)
    .moveTo(55, rodapeY - 8)
    .lineTo(largura - 55, rodapeY - 8)
    .stroke();

  const margemInferior = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;
  try {
    doc
      .fillColor(MUTED)
      .font('Helvetica')
      .fontSize(7)
      .text(
        'Documento gerado pelo Sistema de Arquivo Digital de Pastas Funcionais (SADPF) — SSP-DF.',
        55,
        rodapeY
      );
    doc.text(`Página ${paginaAtual} de ${totalPaginas}`, largura - 55, rodapeY, {
      align: 'right',
      width: 120,
      lineBreak: false,
    });
  } finally {
    doc.page.margins.bottom = margemInferior;
  }
}

export function criarDocumento(opcoes: DocumentoPDFOptions): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 130, bottom: 70, left: 55, right: 55 },
    bufferPages: true,
    info: { Title: opcoes.titulo, Subject: opcoes.subtitulo, Author: 'SADPF - SSP-DF' },
  });

  doc.on('pageAdded', () => desenharCabecalho(doc, opcoes));

  return doc;
}

export function finalizarDocumento(doc: PDFKit.PDFDocument): void {
  const faixa = doc.bufferedPageRange();
  for (let i = 0; i < faixa.count; i++) {
    doc.switchToPage(faixa.start + i);
    desenharRodape(doc, i + 1, faixa.count);
  }
  doc.end();
}

export interface TabelaColuna {
  rotulo: string;
  largura: number;
  alinhamento?: 'esquerda' | 'centro' | 'direita';
}

function alinharTexto(
  texto: string,
  largura: number,
  alinhamento: 'esquerda' | 'centro' | 'direita'
): { width?: number; lineBreak: boolean; align?: 'left' | 'center' | 'right' } {
  return {
    width: largura,
    lineBreak: false,
    align: alinhamento === 'centro' ? 'center' : alinhamento === 'direita' ? 'right' : 'left',
  };
}

/**
 * Desenha uma tabela com cabeçalho repetido em quebras de página.
 * Retorna a posição Y logo abaixo da tabela.
 */
export function desenharTabela(
  doc: PDFKit.PDFDocument,
  colunas: TabelaColuna[],
  linhas: (string | number)[][],
  inicioY?: number
): number {
  const margemEsquerda = 55;
  const margemDireita = doc.page.width - 55;
  const larguraTotal = colunas.reduce((soma, c) => soma + c.largura, 0);
  const xInicial = margemEsquerda + (margemDireita - margemEsquerda - larguraTotal) / 2;
  const padding = 5;
  const alturaMinima = 18;

  let y = inicioY ?? doc.y;
  let x = 0;
  const limiteY = doc.page.height - 70;

  const alturaLinha = (linha: (string | number)[]): number => {
    let altura = 0;
    colunas.forEach((coluna, indice) => {
      const texto = String(linha[indice] ?? '');
      const alturaCelula = doc.heightOfString(texto, {
        width: coluna.largura - padding * 2,
      });
      altura = Math.max(altura, alturaCelula + padding * 2);
    });
    return Math.max(altura, alturaMinima);
  };

  const desenharCabecalhoTabela = (posY: number): number => {
    doc
      .rect(xInicial, posY, larguraTotal, alturaMinima)
      .fill(AZUL_SSP)
      .strokeColor(AZUL_SSP)
      .stroke();

    let x = xInicial;
    colunas.forEach((coluna) => {
      doc
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .text(coluna.rotulo, x + padding, posY + padding, {
          ...alinharTexto(
            coluna.rotulo,
            coluna.largura - padding * 2,
            coluna.alinhamento ?? 'esquerda'
          ),
          lineBreak: false,
        });
      x += coluna.largura;
    });

    return posY + alturaMinima;
  };

  y = desenharCabecalhoTabela(y);

  linhas.forEach((linha, indice) => {
    const altura = alturaLinha(linha);

    if (y + altura > limiteY) {
      doc.addPage();
      y = desenharCabecalhoTabela(doc.y);
    }

    if (indice % 2 === 1) {
      doc.rect(xInicial, y, larguraTotal, altura).fill(FUNDO_LINHA);
    }

    doc.strokeColor(BORDA).lineWidth(0.5).rect(xInicial, y, larguraTotal, altura).stroke();

    x = xInicial;
    colunas.forEach((coluna, indiceColuna) => {
      const texto = String(linha[indiceColuna] ?? '');
      doc
        .fillColor(TEXTO)
        .font('Helvetica')
        .fontSize(7.5)
        .text(texto, x + padding, y + padding, {
          width: coluna.largura - padding * 2,
          height: altura - padding * 2,
          ellipsis: true,
        });
      x += coluna.largura;
    });

    y += altura;
    doc.x = xInicial;
    doc.y = y;
  });

  return y;
}

export function desenharBlocoEstatistica(
  doc: PDFKit.PDFDocument,
  rotulo: string,
  valor: string,
  detalhe: string
): void {
  const x0 = doc.page.margins.left;
  doc
    .fillColor(AZUL_SSP)
    .font('Helvetica-Bold')
    .fontSize(9)
    .text(rotulo.toUpperCase(), x0, doc.y, { width: 210, lineBreak: false });
  doc
    .fillColor(TEXTO)
    .font('Helvetica-Bold')
    .fontSize(18)
    .text(valor, x0, doc.y + 4);
  doc
    .fillColor(MUTED)
    .font('Helvetica')
    .fontSize(7.5)
    .text(detalhe, x0, doc.y + 6, { width: 210 });
  doc.x = x0;
  doc.moveDown(3);
}

export function desenharDestaqueVerde(doc: PDFKit.PDFDocument, texto: string): void {
  doc
    .rect(55, doc.y, doc.page.width - 110, 26)
    .fill(DESTAQUE)
    .strokeColor(DESTAQUE)
    .stroke();
  doc
    .fillColor('#ffffff')
    .font('Helvetica-Bold')
    .fontSize(9)
    .text(texto, 62, doc.y + 9, { width: doc.page.width - 124, lineBreak: false });
  doc.x = doc.page.margins.left;
  doc.y += 32;
}

async function obterFotoServidor(servidor: Servidor): Promise<Buffer | null> {
  if (servidor.fotoStorageKey && servidor.fotoStorageBackend) {
    try {
      return await getStorage(servidor.fotoStorageBackend).download(servidor.fotoStorageKey);
    } catch {
      return null;
    }
  }

  const fotoUrl = servidor.fotoUrl;
  if (!fotoUrl) return null;

  try {
    if (fotoUrl.startsWith('data:image/')) {
      const base64 = fotoUrl.split(',', 2)[1];
      return base64 ? Buffer.from(base64, 'base64') : null;
    }

    if (fotoUrl.startsWith('/')) {
      const caminho = normalize(fotoUrl).replace(/^[/\\]+/, '');
      if (caminho.startsWith('..')) return null;
      return await readFile(join(process.cwd(), 'public', caminho));
    }

    const url = new URL(fotoUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return null;

    const resposta = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    if (!resposta.ok) return null;

    const conteudo = Buffer.from(await resposta.arrayBuffer());
    return conteudo.length <= 5 * 1024 * 1024 ? conteudo : null;
  } catch {
    return null;
  }
}

export async function desenharDadosServidor(
  doc: PDFKit.PDFDocument,
  servidor: Servidor
): Promise<void> {
  const campos: { rotulo: string; valor: string }[] = [
    { rotulo: 'Nome', valor: servidor.nome },
    { rotulo: 'Matrícula', valor: servidor.matricula },
    { rotulo: 'CPF', valor: servidor.cpf },
    { rotulo: 'Cargo Efetivo', valor: servidor.cargoEfetivo },
    { rotulo: 'Cargo Ocupado', valor: servidor.cargoOcupado },
    { rotulo: 'Lotação Atual', valor: servidor.lotacao },
    { rotulo: 'Data de Ingresso', valor: servidor.dataIngresso },
    { rotulo: 'E-mail', valor: servidor.email || '—' },
    { rotulo: 'Telefone', valor: servidor.telefone || '—' },
    { rotulo: 'Status', valor: servidor.status },
  ];

  const colunas = [
    { xRotulo: 55, xValor: 135 },
    { xRotulo: 265, xValor: 345 },
  ];
  const alturaLinha = 17;
  const yInicial = doc.y;

  campos.forEach((campo, indice) => {
    const linhaIndex = Math.floor(indice / 2);
    const colunaIndex = indice % 2;
    const y = yInicial + linhaIndex * alturaLinha;

    doc
      .fillColor(MUTED)
      .font('Helvetica')
      .fontSize(8)
      .text(campo.rotulo, colunas[colunaIndex].xRotulo, y, { width: 75, lineBreak: false });
    doc
      .fillColor(TEXTO)
      .font('Helvetica-Bold')
      .fontSize(8)
      .text(campo.valor, colunas[colunaIndex].xValor, y, {
        width: 105,
        lineBreak: false,
        ellipsis: true,
      });
  });

  const fotoX = 465;
  const fotoY = yInicial;
  const fotoLargura = 75;
  const fotoAltura = 90;
  doc.rect(fotoX, fotoY, fotoLargura, fotoAltura).fill('#f1f5f9').strokeColor(BORDA).stroke();

  const foto = await obterFotoServidor(servidor);
  if (foto) {
    try {
      doc.image(foto, fotoX + 3, fotoY + 3, {
        fit: [fotoLargura - 6, fotoAltura - 6],
        align: 'center',
        valign: 'center',
      });
    } catch {}
  }
  if (!foto) {
    doc
      .fillColor(MUTED)
      .font('Helvetica')
      .fontSize(7)
      .text('SEM FOTO', fotoX, fotoY + fotoAltura / 2 - 4, {
        width: fotoLargura,
        align: 'center',
        lineBreak: false,
      });
  }

  doc.x = doc.page.margins.left;
  doc.y = Math.max(yInicial + Math.ceil(campos.length / 2) * alturaLinha, fotoY + fotoAltura) + 10;
}

export function desenharListaDocumentos(doc: PDFKit.PDFDocument, documentos: DocumentoPDF[]): void {
  if (documentos.length === 0) {
    doc
      .fillColor(MUTED)
      .font('Helvetica')
      .fontSize(9)
      .text('Nenhum documento anexado a esta pasta funcional.', 55, doc.y);
    return;
  }

  const colunas: TabelaColuna[] = [
    { rotulo: 'TÍTULO DO DOCUMENTO', largura: 210 },
    { rotulo: 'CATEGORIA', largura: 120, alinhamento: 'esquerda' },
    { rotulo: 'ENVIO', largura: 70, alinhamento: 'centro' },
    { rotulo: 'TAMANHO', largura: 55, alinhamento: 'centro' },
    { rotulo: 'SEI', largura: 100, alinhamento: 'esquerda' },
  ];

  const linhas = documentos.map((d) => [
    d.titulo,
    d.categoria,
    d.dataUpload,
    d.tamanho,
    d.processoSEI ?? '—',
  ]);

  desenharTabela(doc, colunas, linhas);
}
