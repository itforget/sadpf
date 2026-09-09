import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';

const AZUL_SSP = rgb(0.04, 0.3, 0.55);
const AZUL_TEXTO = rgb(0.03, 0.12, 0.29);
const CINZA_BORDA = rgb(0.76, 0.79, 0.84);

function formatarDataAssinatura(assinadoEm: Date): string {
  const partes = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(assinadoEm);
  const valores = Object.fromEntries(
    partes.filter(({ type }) => type !== 'literal').map(({ type, value }) => [type, value])
  );

  return `${valores.day}/${valores.month}/${valores.year} às ${valores.hour}:${valores.minute}:${valores.second} (horário de Brasília)`;
}

function formatarCodigoVerificacao(token: string): string {
  return token.match(/.{1,4}/g)?.join('-') ?? token;
}

export async function adicionarSeloDeAssinatura(
  arquivo: Buffer,
  assinadoEm: Date,
  token: string,
  urlValidacao: string,
  assinante: { nome: string; matricula: string; cargo: string } = {
    nome: 'Servidor não informado',
    matricula: 'Não informada',
    cargo: 'Função não informada',
  }
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(arquivo, { ignoreEncryption: true });
  const pagina = pdf.getPages().at(-1);
  if (!pagina) throw new Error('O arquivo PDF não possui páginas.');

  const [fonteRegular, fonteNegrito, qrBytes] = await Promise.all([
    pdf.embedFont(StandardFonts.Helvetica),
    pdf.embedFont(StandardFonts.HelveticaBold),
    QRCode.toBuffer(urlValidacao, { errorCorrectionLevel: 'M', margin: 1, width: 128 }),
  ]);
  const qrCode = await pdf.embedPng(qrBytes);
  const { width } = pagina.getSize();
  const larguraCartao = Math.min(440, width - 56);
  const xCartao = (width - larguraCartao) / 2;
  const yCartao = 30;
  const alturaCartao = 154;
  const xSeparadorEsquerdo = xCartao + 106;
  const xSeparadorDireito = xCartao + larguraCartao - 78;
  const xConteudo = xSeparadorEsquerdo + 14;
  const larguraQr = 52;
  const codigo = formatarCodigoVerificacao(token);

  pagina.drawRectangle({
    x: xCartao,
    y: yCartao,
    width: larguraCartao,
    height: alturaCartao,
    borderColor: AZUL_SSP,
    borderWidth: 1.2,
  });
  pagina.drawLine({
    start: { x: xSeparadorEsquerdo, y: yCartao + 56 },
    end: { x: xSeparadorEsquerdo, y: yCartao + alturaCartao - 10 },
    thickness: 0.6,
    color: CINZA_BORDA,
  });
  pagina.drawLine({
    start: { x: xSeparadorDireito, y: yCartao + 56 },
    end: { x: xSeparadorDireito, y: yCartao + alturaCartao - 10 },
    thickness: 0.6,
    color: CINZA_BORDA,
  });

  pagina.drawText('SSPDF', {
    x: xCartao + 15,
    y: yCartao + 111,
    size: 22,
    font: fonteNegrito,
    color: AZUL_SSP,
  });
  pagina.drawText('Secretaria de Estado\nde Segurança Pública\ndo Distrito Federal', {
    x: xCartao + 16,
    y: yCartao + 92,
    size: 8.2,
    lineHeight: 11,
    font: fonteRegular,
    color: AZUL_TEXTO,
  });

  const centroCheck = { x: xConteudo + 11, y: yCartao + 127 };
  pagina.drawCircle({ x: centroCheck.x, y: centroCheck.y, size: 11, color: AZUL_SSP });
  pagina.drawLine({
    start: { x: centroCheck.x - 5, y: centroCheck.y },
    end: { x: centroCheck.x - 1, y: centroCheck.y - 4 },
    thickness: 1.7,
    color: rgb(1, 1, 1),
  });
  pagina.drawLine({
    start: { x: centroCheck.x - 1, y: centroCheck.y - 4 },
    end: { x: centroCheck.x + 6, y: centroCheck.y + 5 },
    thickness: 1.7,
    color: rgb(1, 1, 1),
  });
  const xDetalhesAssinatura = xConteudo + 30;
  pagina.drawText('DOCUMENTO ASSINADO ELETRONICAMENTE', {
    x: xDetalhesAssinatura,
    y: yCartao + 130,
    size: 9.3,
    font: fonteNegrito,
    color: AZUL_TEXTO,
  });
  pagina.drawText(`Assinado em ${formatarDataAssinatura(assinadoEm)}`, {
    x: xDetalhesAssinatura,
    y: yCartao + 116,
    size: 7.4,
    font: fonteRegular,
    color: AZUL_TEXTO,
  });
  pagina.drawLine({
    start: { x: xConteudo, y: yCartao + 101 },
    end: { x: xSeparadorDireito - 9, y: yCartao + 101 },
    thickness: 0.7,
    color: AZUL_SSP,
  });
  pagina.drawText(assinante.nome.toLocaleUpperCase('pt-BR'), {
    x: xConteudo,
    y: yCartao + 85,
    size: 9.2,
    font: fonteNegrito,
    color: AZUL_TEXTO,
    maxWidth: xSeparadorDireito - xConteudo - 9,
  });
  pagina.drawText(assinante.cargo || 'Função não informada', {
    x: xConteudo,
    y: yCartao + 72,
    size: 8.2,
    font: fonteRegular,
    color: AZUL_TEXTO,
    maxWidth: xSeparadorDireito - xConteudo - 9,
  });
  pagina.drawText(`Matrícula: ${assinante.matricula}`, {
    x: xConteudo,
    y: yCartao + 59,
    size: 8.2,
    font: fonteRegular,
    color: AZUL_TEXTO,
  });

  const xQr = xSeparadorDireito + 13;
  const yQr = yCartao + 92;
  pagina.drawImage(qrCode, { x: xQr, y: yQr, width: larguraQr, height: larguraQr });
  const link = pdf.context.register(
    pdf.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [xQr, yQr, xQr + larguraQr, yQr + larguraQr],
      Border: [0, 0, 0],
      A: { S: 'URI', URI: urlValidacao },
    })
  );
  pagina.node.addAnnot(link);

  pagina.drawLine({
    start: { x: xCartao + 12, y: yCartao + 47 },
    end: { x: xCartao + larguraCartao - 12, y: yCartao + 47 },
    thickness: 0.7,
    color: CINZA_BORDA,
  });
  const centroEscudo = { x: xCartao + 29, y: yCartao + 24 };
  pagina.drawCircle({
    x: centroEscudo.x,
    y: centroEscudo.y,
    size: 14,
    borderColor: AZUL_SSP,
    borderWidth: 1.2,
  });
  pagina.drawLine({
    start: { x: centroEscudo.x - 5, y: centroEscudo.y - 1 },
    end: { x: centroEscudo.x - 1, y: centroEscudo.y - 5 },
    thickness: 1.4,
    color: AZUL_SSP,
  });
  pagina.drawLine({
    start: { x: centroEscudo.x - 1, y: centroEscudo.y - 5 },
    end: { x: centroEscudo.x + 6, y: centroEscudo.y + 3 },
    thickness: 1.4,
    color: AZUL_SSP,
  });
  const xAutenticidade = xCartao + 52;
  pagina.drawText('AUTENTICIDADE DO DOCUMENTO', {
    x: xAutenticidade,
    y: yCartao + 34,
    size: 7.4,
    font: fonteNegrito,
    color: AZUL_TEXTO,
  });
  pagina.drawText('Valide pelo QR Code ou pelo link de conferência.', {
    x: xAutenticidade,
    y: yCartao + 23,
    size: 6.3,
    font: fonteRegular,
    color: AZUL_TEXTO,
  });
  pagina.drawText(`Código de verificação: ${codigo}`, {
    x: xAutenticidade,
    y: yCartao + 11,
    size: 6.8,
    font: fonteNegrito,
    color: AZUL_TEXTO,
    maxWidth: larguraCartao - (xAutenticidade - xCartao) - 12,
  });

  return pdf.save({ useObjectStreams: true, addDefaultPage: false });
}
