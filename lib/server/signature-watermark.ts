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
    QRCode.toBuffer(urlValidacao, { errorCorrectionLevel: 'M', margin: 1, width: 256 }),
  ]);
  const qrCode = await pdf.embedPng(qrBytes);
  const { width } = pagina.getSize();
  const margem = 34;
  const larguraCartao = width - margem * 2;
  const larguraQr = 67;
  const xSeparadorEsquerdo = margem + 130;
  const xSeparadorDireito = margem + larguraCartao - 100;
  const xConteudo = xSeparadorEsquerdo + 18;
  const codigo = formatarCodigoVerificacao(token);
  const yAutenticidade = 30;
  const alturaAutenticidade = 112;
  const yAssinatura = yAutenticidade + alturaAutenticidade + 13;
  const alturaAssinatura = 142;

  const desenharCartao = (y: number, altura: number, corBorda: typeof AZUL_SSP) => {
    pagina.drawRectangle({
      x: margem,
      y,
      width: larguraCartao,
      height: altura,
      borderColor: corBorda,
      borderWidth: 1.2,
    });
  };
  const adicionarLink = (x: number, y: number, largura: number, altura: number) => {
    const link = pdf.context.register(
      pdf.context.obj({
        Type: 'Annot',
        Subtype: 'Link',
        Rect: [x, y, x + largura, y + altura],
        Border: [0, 0, 0],
        A: { S: 'URI', URI: urlValidacao },
      })
    );
    pagina.node.addAnnot(link);
  };

  desenharCartao(yAssinatura, alturaAssinatura, AZUL_SSP);
  pagina.drawLine({
    start: { x: xSeparadorEsquerdo, y: yAssinatura + 14 },
    end: { x: xSeparadorEsquerdo, y: yAssinatura + alturaAssinatura - 14 },
    thickness: 0.6,
    color: CINZA_BORDA,
  });
  pagina.drawLine({
    start: { x: xSeparadorDireito, y: yAssinatura + 14 },
    end: { x: xSeparadorDireito, y: yAssinatura + alturaAssinatura - 14 },
    thickness: 0.6,
    color: CINZA_BORDA,
  });
  pagina.drawText('SSPDF', {
    x: margem + 19,
    y: yAssinatura + 87,
    size: 27,
    font: fonteNegrito,
    color: AZUL_SSP,
  });
  pagina.drawText('Secretaria de Estado\nde Segurança Pública\ndo Distrito Federal', {
    x: margem + 20,
    y: yAssinatura + 63,
    size: 10.5,
    lineHeight: 15,
    font: fonteRegular,
    color: AZUL_TEXTO,
  });

  const centroCheck = { x: xConteudo + 15, y: yAssinatura + 111 };
  pagina.drawCircle({ x: centroCheck.x, y: centroCheck.y, size: 14, color: AZUL_SSP });
  pagina.drawLine({
    start: { x: centroCheck.x - 6, y: centroCheck.y },
    end: { x: centroCheck.x - 1, y: centroCheck.y - 5 },
    thickness: 2.1,
    color: rgb(1, 1, 1),
  });
  pagina.drawLine({
    start: { x: centroCheck.x - 1, y: centroCheck.y - 5 },
    end: { x: centroCheck.x + 8, y: centroCheck.y + 6 },
    thickness: 2.1,
    color: rgb(1, 1, 1),
  });
  const xDetalhesAssinatura = xConteudo + 38;
  pagina.drawText('DOCUMENTO ASSINADO ELETRONICAMENTE', {
    x: xDetalhesAssinatura,
    y: yAssinatura + 114,
    size: 10.4,
    font: fonteNegrito,
    color: AZUL_TEXTO,
  });
  const textoData = `Assinado em ${formatarDataAssinatura(assinadoEm)}`;
  pagina.drawText(textoData, {
    x: xDetalhesAssinatura,
    y: yAssinatura + 96,
    size: 9.5,
    font: fonteRegular,
    color: AZUL_TEXTO,
  });
  pagina.drawText('conforme Decreto nº 36.756, de 16 de setembro de 2015.', {
    x: xDetalhesAssinatura,
    y: yAssinatura + 80,
    size: 8.8,
    font: fonteRegular,
    color: AZUL_TEXTO,
  });
  pagina.drawLine({
    start: { x: xConteudo, y: yAssinatura + 65 },
    end: { x: xSeparadorDireito - 12, y: yAssinatura + 65 },
    thickness: 0.7,
    color: AZUL_SSP,
  });
  pagina.drawText(assinante.nome.toLocaleUpperCase('pt-BR'), {
    x: xConteudo,
    y: yAssinatura + 46,
    size: 10.8,
    font: fonteNegrito,
    color: AZUL_TEXTO,
    maxWidth: xSeparadorDireito - xConteudo - 12,
  });
  pagina.drawText(assinante.cargo || 'Função não informada', {
    x: xConteudo,
    y: yAssinatura + 31,
    size: 9.5,
    font: fonteRegular,
    color: AZUL_TEXTO,
    maxWidth: xSeparadorDireito - xConteudo - 12,
  });
  pagina.drawText(`Matrícula: ${assinante.matricula}`, {
    x: xConteudo,
    y: yAssinatura + 17,
    size: 9.5,
    font: fonteRegular,
    color: AZUL_TEXTO,
  });
  pagina.drawImage(qrCode, {
    x: xSeparadorDireito + 16,
    y: yAssinatura + 61,
    width: larguraQr,
    height: larguraQr,
  });
  adicionarLink(xSeparadorDireito + 16, yAssinatura + 61, larguraQr, larguraQr);
  pagina.drawRectangle({
    x: xSeparadorDireito + 19,
    y: yAssinatura + 22,
    width: 13,
    height: 11,
    color: AZUL_SSP,
  });
  pagina.drawCircle({
    x: xSeparadorDireito + 25.5,
    y: yAssinatura + 34,
    size: 5.5,
    borderColor: AZUL_SSP,
    borderWidth: 2,
  });
  pagina.drawText('Assinatura digital\nválida e segura', {
    x: xSeparadorDireito + 39,
    y: yAssinatura + 22,
    size: 7.8,
    lineHeight: 10,
    font: fonteRegular,
    color: AZUL_TEXTO,
  });

  desenharCartao(yAutenticidade, alturaAutenticidade, CINZA_BORDA);
  const centroEscudo = { x: margem + 42, y: yAutenticidade + 57 };
  pagina.drawCircle({
    x: centroEscudo.x,
    y: centroEscudo.y,
    size: 27,
    borderColor: AZUL_SSP,
    borderWidth: 1.5,
  });
  pagina.drawLine({
    start: { x: centroEscudo.x - 11, y: centroEscudo.y + 6 },
    end: { x: centroEscudo.x, y: centroEscudo.y + 13 },
    thickness: 1.8,
    color: AZUL_SSP,
  });
  pagina.drawLine({
    start: { x: centroEscudo.x, y: centroEscudo.y + 13 },
    end: { x: centroEscudo.x + 11, y: centroEscudo.y + 6 },
    thickness: 1.8,
    color: AZUL_SSP,
  });
  pagina.drawLine({
    start: { x: centroEscudo.x - 11, y: centroEscudo.y + 6 },
    end: { x: centroEscudo.x - 8, y: centroEscudo.y - 10 },
    thickness: 1.8,
    color: AZUL_SSP,
  });
  pagina.drawLine({
    start: { x: centroEscudo.x - 8, y: centroEscudo.y - 10 },
    end: { x: centroEscudo.x, y: centroEscudo.y - 15 },
    thickness: 1.8,
    color: AZUL_SSP,
  });
  pagina.drawLine({
    start: { x: centroEscudo.x, y: centroEscudo.y - 15 },
    end: { x: centroEscudo.x + 8, y: centroEscudo.y - 10 },
    thickness: 1.8,
    color: AZUL_SSP,
  });
  pagina.drawLine({
    start: { x: centroEscudo.x + 8, y: centroEscudo.y - 10 },
    end: { x: centroEscudo.x + 11, y: centroEscudo.y + 6 },
    thickness: 1.8,
    color: AZUL_SSP,
  });
  pagina.drawLine({
    start: { x: centroEscudo.x - 7, y: centroEscudo.y - 1 },
    end: { x: centroEscudo.x - 1, y: centroEscudo.y - 7 },
    thickness: 1.8,
    color: AZUL_SSP,
  });
  pagina.drawLine({
    start: { x: centroEscudo.x - 1, y: centroEscudo.y - 7 },
    end: { x: centroEscudo.x + 8, y: centroEscudo.y + 4 },
    thickness: 1.8,
    color: AZUL_SSP,
  });
  const xAutenticidade = margem + 82;
  pagina.drawText('AUTENTICIDADE DO DOCUMENTO', {
    x: xAutenticidade,
    y: yAutenticidade + 80,
    size: 10.5,
    font: fonteNegrito,
    color: AZUL_TEXTO,
  });
  pagina.drawText(
    'A autenticidade deste documento pode ser conferida no site da SSPDF\nou por meio do QR Code ao lado.',
    {
      x: xAutenticidade,
      y: yAutenticidade + 61,
      size: 8.7,
      lineHeight: 12,
      font: fonteRegular,
      color: AZUL_TEXTO,
    }
  );
  pagina.drawText(`Código de verificação: ${codigo}`, {
    x: xAutenticidade,
    y: yAutenticidade + 38,
    size: 8.8,
    font: fonteNegrito,
    color: AZUL_TEXTO,
    maxWidth: xSeparadorDireito - xAutenticidade - 10,
  });
  pagina.drawText(`Para verificar a autenticidade, acesse: ${urlValidacao}`, {
    x: xAutenticidade,
    y: yAutenticidade + 17,
    size: 5.7,
    font: fonteRegular,
    color: AZUL_SSP,
    maxWidth: xSeparadorDireito - xAutenticidade - 10,
  });
  pagina.drawImage(qrCode, {
    x: xSeparadorDireito + 16,
    y: yAutenticidade + 22,
    width: larguraQr,
    height: larguraQr,
  });
  adicionarLink(xSeparadorDireito + 16, yAutenticidade + 22, larguraQr, larguraQr);

  return pdf.save();
}
