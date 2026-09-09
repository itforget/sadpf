import { readFile } from 'fs/promises';
import { join } from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const AZUL_SSP = rgb(0.04, 0.3, 0.55);

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
  urlValidacao: string
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(arquivo, { ignoreEncryption: true });
  const pagina = pdf.getPages().at(-1);
  if (!pagina) throw new Error('O arquivo PDF não possui páginas.');

  const [fonteRegular, fonteNegrito, logoBytes] = await Promise.all([
    pdf.embedFont(StandardFonts.Helvetica),
    pdf.embedFont(StandardFonts.HelveticaBold),
    readFile(join(process.cwd(), 'public', 'logo-sspdf.png')),
  ]);
  const logo = await pdf.embedPng(logoBytes);
  const { width } = pagina.getSize();
  const margem = 28;
  const seloY = 30;
  const larguraSelo = width - margem * 2;
  const textoAutenticidade = 'A autenticidade deste documento pode ser conferida no site.';

  pagina.drawLine({
    start: { x: margem, y: seloY + 112 },
    end: { x: width - margem, y: seloY + 112 },
    thickness: 0.7,
    color: AZUL_SSP,
  });
  pagina.drawText('DOCUMENTO ASSINADO ELETRONICAMENTE', {
    x: margem,
    y: seloY + 100,
    size: 7,
    font: fonteNegrito,
    color: AZUL_SSP,
  });

  const logoDimensoes = logo.scaleToFit(30, 30);
  pagina.drawImage(logo, {
    x: margem,
    y: seloY + 58,
    width: logoDimensoes.width,
    height: logoDimensoes.height,
  });
  const textoInstitucionalX = margem + logoDimensoes.width + 8;
  pagina.drawText('SSPDF', {
    x: textoInstitucionalX,
    y: seloY + 82,
    size: 8,
    font: fonteNegrito,
    color: AZUL_SSP,
  });
  pagina.drawText('Secretaria de Estado\nde Segurança Pública\ndo Distrito Federal', {
    x: textoInstitucionalX,
    y: seloY + 72,
    size: 5.8,
    lineHeight: 7,
    font: fonteRegular,
    color: AZUL_SSP,
  });

  pagina.drawText('DOCUMENTO ASSINADO ELETRONICAMENTE', {
    x: margem,
    y: seloY + 42,
    size: 6.5,
    font: fonteNegrito,
    color: AZUL_SSP,
  });
  pagina.drawText(`Assinado em ${formatarDataAssinatura(assinadoEm)}`, {
    x: margem,
    y: seloY + 31,
    size: 6,
    font: fonteRegular,
    color: rgb(0.12, 0.16, 0.22),
  });
  pagina.drawText(textoAutenticidade, {
    x: margem,
    y: seloY + 21,
    size: 5.5,
    font: fonteRegular,
    color: rgb(0.12, 0.16, 0.22),
  });
  pagina.drawText(`Código de verificação: ${formatarCodigoVerificacao(token)}`, {
    x: margem,
    y: seloY + 11,
    size: 5.2,
    font: fonteRegular,
    color: rgb(0.12, 0.16, 0.22),
    maxWidth: larguraSelo,
  });

  const larguraLink = fonteRegular.widthOfTextAtSize(textoAutenticidade, 5.5);
  const link = pdf.context.register(
    pdf.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [margem, seloY + 20, margem + larguraLink, seloY + 27],
      Border: [0, 0, 0],
      A: { S: 'URI', URI: urlValidacao },
    })
  );
  pagina.node.addAnnot(link);

  return pdf.save();
}
