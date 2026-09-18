import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFFont,
  PDFName,
  PDFNumber,
  PDFPage,
  concatTransformationMatrix,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  StandardFonts,
} from 'pdf-lib';
import QRCode from 'qrcode';

const AZUL_SSP = rgb(0.04, 0.3, 0.55);
const AZUL_TEXTO = rgb(0.03, 0.12, 0.29);
const CINZA_BORDA = rgb(0.76, 0.79, 0.84);
const ALTURA_RESERVADA = 128;
const LARGURA_SELO = 440;
const ALTURA_SELO = 96;

function formatarDataAssinatura(assinadoEm: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(assinadoEm);
}

function deslocarAnotacoes(pagina: PDFPage, dx: number, dy: number) {
  const anotacoes = pagina.node.Annots();
  if (!anotacoes || (!dx && !dy)) return;
  const deslocar = (coordenadas: PDFArray) => {
    for (let i = 0; i < coordenadas.size(); i++) {
      const valor = coordenadas.lookup(i);
      if (valor instanceof PDFNumber)
        coordenadas.set(i, PDFNumber.of(valor.asNumber() + (i % 2 ? dy : dx)));
    }
  };
  for (let i = 0; i < anotacoes.size(); i++) {
    const anotacao = anotacoes.lookup(i);
    if (!(anotacao instanceof PDFDict)) continue;
    for (const chave of ['Rect', 'QuadPoints', 'Vertices', 'L', 'CL']) {
      const coordenadas = anotacao.lookup(PDFName.of(chave));
      if (coordenadas instanceof PDFArray) deslocar(coordenadas);
    }
    const tinta = anotacao.lookup(PDFName.of('InkList'));
    if (tinta instanceof PDFArray) {
      for (let j = 0; j < tinta.size(); j++) {
        const coordenadas = tinta.lookup(j);
        if (coordenadas instanceof PDFArray) deslocar(coordenadas);
      }
    }
  }
}

/** Acrescenta espaço físico à última página, preservando a escala do conteúdo. */
function reservarEspaco(pdf: PDFDocument) {
  const pagina = pdf.getPages().at(-1);
  if (!pagina) throw new Error('O arquivo PDF não possui páginas.');
  const rotacao = ((pagina.getRotation().angle % 360) + 360) % 360;
  const horizontal = rotacao === 90 || rotacao === 270;
  const dx = rotacao === 270 ? ALTURA_RESERVADA : 0;
  const dy = rotacao === 0 ? ALTURA_RESERVADA : 0;
  const caixas = [
    pagina.getMediaBox(),
    pagina.getCropBox(),
    pagina.getBleedBox(),
    pagina.getTrimBox(),
    pagina.getArtBox(),
  ];
  const novasCaixas = caixas.map(({ x, y, width, height }) => ({
    x,
    y,
    width: width + (horizontal ? ALTURA_RESERVADA : 0),
    height: height + (horizontal ? 0 : ALTURA_RESERVADA),
  }));
  const setters = [
    pagina.setMediaBox.bind(pagina),
    pagina.setCropBox.bind(pagina),
    pagina.setBleedBox.bind(pagina),
    pagina.setTrimBox.bind(pagina),
    pagina.setArtBox.bind(pagina),
  ];
  novasCaixas.forEach(({ x, y, width, height }, i) => setters[i](x, y, width, height));
  if (dx || dy) {
    pagina.translateContent(dx, dy);
    pagina.resetPosition();
  }
  deslocarAnotacoes(pagina, dx, dy);

  const { x, y, width, height } = novasCaixas[1];
  const matriz: [number, number, number, number, number, number] =
    rotacao === 90
      ? [0, 1, -1, 0, x + width, y]
      : rotacao === 180
      ? [-1, 0, 0, -1, x + width, y + height]
      : rotacao === 270
      ? [0, -1, 1, 0, x, y + height]
      : [1, 0, 0, 1, x, y];
  const larguraVisivel = horizontal ? height : width;
  pagina.pushOperators(pushGraphicsState(), concatTransformationMatrix(...matriz));
  pagina.drawRectangle({
    x: 0,
    y: 0,
    width: larguraVisivel,
    height: ALTURA_RESERVADA,
    color: rgb(1, 1, 1),
  });
  pagina.pushOperators(popGraphicsState());
  return { pagina, larguraVisivel, matriz };
}

export async function prepararPdfParaAssinatura(arquivo: Buffer): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(arquivo, { ignoreEncryption: true });
  reservarEspaco(pdf);
  return pdf.save({ useObjectStreams: true, addDefaultPage: false });
}

function tamanhoParaLargura(fonte: PDFFont, texto: string, tamanho: number, largura: number) {
  const medida = fonte.widthOfTextAtSize(texto, tamanho);
  return medida > largura ? (tamanho * largura) / medida : tamanho;
}

function linhasDoNome(fonte: PDFFont, nome: string, largura: number) {
  let tamanho = 9.2;
  let linhas: string[];
  do {
    linhas = [''];
    for (const palavra of nome.trim().split(/\s+/)) {
      const ultima = linhas.length - 1;
      const proxima = linhas[ultima] ? `${linhas[ultima]} ${palavra}` : palavra;
      if (linhas[ultima] && fonte.widthOfTextAtSize(proxima, tamanho) > largura)
        linhas.push(palavra);
      else linhas[ultima] = proxima;
    }
    if (linhas.length <= 2) break;
    tamanho -= 0.5;
  } while (tamanho > 5);
  // Nomes excepcionalmente longos cabem em uma linha sem perder caracteres.
  if (linhas.length > 2)
    return { linhas: [nome], tamanho: tamanhoParaLargura(fonte, nome, 9.2, largura) };
  tamanho = Math.min(...linhas.map((linha) => tamanhoParaLargura(fonte, linha, tamanho, largura)));
  return { linhas, tamanho };
}

export async function adicionarSeloDeAssinatura(
  arquivo: Buffer,
  assinadoEm: Date,
  token: string,
  urlValidacao: string,
  assinante: { nome: string } = { nome: 'Servidor não informado' }
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(arquivo, { ignoreEncryption: true });
  const { pagina, larguraVisivel, matriz } = reservarEspaco(pdf);
  const [fonteRegular, fonteNegrito, qrBytes] = await Promise.all([
    pdf.embedFont(StandardFonts.Helvetica),
    pdf.embedFont(StandardFonts.HelveticaBold),
    QRCode.toBuffer(urlValidacao, { errorCorrectionLevel: 'M', margin: 1, width: 128 }),
  ]);
  const qrCode = await pdf.embedPng(qrBytes);
  const escala = Math.min(1, (larguraVisivel - 32) / LARGURA_SELO);
  if (escala <= 0) throw new Error('A página PDF é estreita demais para a assinatura.');
  const xCartao = (larguraVisivel - LARGURA_SELO * escala) / 2;
  const yCartao = 16;
  pagina.pushOperators(
    pushGraphicsState(),
    concatTransformationMatrix(...matriz),
    concatTransformationMatrix(escala, 0, 0, escala, xCartao, yCartao)
  );

  const raio = 8;
  const w = LARGURA_SELO;
  const h = ALTURA_SELO;
  pagina.drawSvgPath(
    `M ${raio} 0 H ${w - raio} Q ${w} 0 ${w} ${raio} V ${h - raio} Q ${w} ${h} ${
      w - raio
    } ${h} H ${raio} Q 0 ${h} 0 ${h - raio} V ${raio} Q 0 0 ${raio} 0 Z`,
    { x: 0, y: h, color: rgb(1, 1, 1), borderColor: AZUL_SSP, borderWidth: 0.7 }
  );
  pagina.drawLine({
    start: { x: 94, y: 32 },
    end: { x: 94, y: 80 },
    thickness: 0.5,
    color: CINZA_BORDA,
  });
  pagina.drawText('SSPDF', { x: 12, y: 69, size: 17, font: fonteNegrito, color: AZUL_SSP });
  pagina.drawText('Secretaria de Estado\nde Segurança Pública\ndo Distrito Federal', {
    x: 12,
    y: 55,
    size: 6.7,
    lineHeight: 9,
    font: fonteRegular,
    color: AZUL_TEXTO,
  });
  pagina.drawText('DOCUMENTO ASSINADO ELETRONICAMENTE', {
    x: 106,
    y: 78,
    size: 8,
    font: fonteNegrito,
    color: AZUL_TEXTO,
  });
  const nome = linhasDoNome(fonteNegrito, assinante.nome.toLocaleUpperCase('pt-BR'), 260);
  pagina.drawText(nome.linhas.join('\n'), {
    x: 106,
    y: 60,
    size: nome.tamanho,
    lineHeight: 10,
    font: fonteNegrito,
    color: AZUL_TEXTO,
  });
  pagina.drawText(`Assinado em ${formatarDataAssinatura(assinadoEm)}`, {
    x: 106,
    y: 35,
    size: 7.4,
    font: fonteRegular,
    color: AZUL_TEXTO,
  });
  pagina.drawText('Horário de Brasília', {
    x: 106,
    y: 25,
    size: 6.5,
    font: fonteRegular,
    color: AZUL_TEXTO,
  });
  const xQr = 382;
  const yQr = 40;
  const larguraQr = 44;
  pagina.drawImage(qrCode, { x: xQr, y: yQr, width: larguraQr, height: larguraQr });
  pagina.drawText('Validar documento', {
    x: 377,
    y: 30,
    size: 6.3,
    font: fonteRegular,
    color: AZUL_TEXTO,
  });
  const codigo = token.match(/.{1,4}/g)?.join('-') ?? token;
  const verificacao = `Código de verificação: ${codigo}`;
  pagina.drawText(verificacao, {
    x: 12,
    y: 10,
    size: tamanhoParaLargura(fonteNegrito, verificacao, 6.8, w - 24),
    font: fonteNegrito,
    color: AZUL_TEXTO,
  });
  pagina.pushOperators(popGraphicsState());

  // A área clicável acompanha a orientação da página e a escala do selo.
  const pontos = [
    [xQr, yQr],
    [xQr + larguraQr, yQr],
    [xQr, yQr + larguraQr],
    [xQr + larguraQr, yQr + larguraQr],
  ].map(([x, y]) => {
    const u = xCartao + x * escala;
    const v = yCartao + y * escala;
    return [matriz[0] * u + matriz[2] * v + matriz[4], matriz[1] * u + matriz[3] * v + matriz[5]];
  });
  const link = pdf.context.register(
    pdf.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [
        Math.min(...pontos.map((p) => p[0])),
        Math.min(...pontos.map((p) => p[1])),
        Math.max(...pontos.map((p) => p[0])),
        Math.max(...pontos.map((p) => p[1])),
      ],
      Border: [0, 0, 0],
      A: { S: 'URI', URI: urlValidacao },
    })
  );
  pagina.node.addAnnot(link);
  return pdf.save({ useObjectStreams: true, addDefaultPage: false });
}
