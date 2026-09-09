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
  const seloY = 24;
  const larguraSelo = width - margem * 2;
  const textoAutenticidade = 'A autenticidade deste documento pode ser conferida no site.';
  const centralizar = (texto: string, tamanho: number, fonte = fonteRegular) =>
    (width - fonte.widthOfTextAtSize(texto, tamanho)) / 2;

  pagina.drawLine({
    start: { x: margem, y: seloY + 142 },
    end: { x: width - margem, y: seloY + 142 },
    thickness: 0.7,
    color: AZUL_SSP,
  });
  const tituloAssinatura = 'DOCUMENTO ASSINADO ELETRONICAMENTE';

  const logoDimensoes = logo.scaleToFit(48, 48);
  const linhasInstitucionais = 'Secretaria de Estado\nde Segurança Pública\ndo Distrito Federal';
  const grupoInstitucionalX = Math.max(
    margem,
    centralizar(tituloAssinatura, 10, fonteNegrito) - 70
  );
  pagina.drawImage(logo, {
    x: grupoInstitucionalX,
    y: seloY + 76,
    width: logoDimensoes.width,
    height: logoDimensoes.height,
  });
  const textoInstitucionalX = grupoInstitucionalX + logoDimensoes.width + 12;
  pagina.drawText('SSPDF', {
    x: textoInstitucionalX,
    y: seloY + 108,
    size: 13,
    font: fonteNegrito,
    color: AZUL_SSP,
  });
  pagina.drawText(linhasInstitucionais, {
    x: textoInstitucionalX,
    y: seloY + 94,
    size: 8.5,
    lineHeight: 10,
    font: fonteRegular,
    color: AZUL_SSP,
  });

  pagina.drawText(tituloAssinatura, {
    x: centralizar(tituloAssinatura, 10, fonteNegrito),
    y: seloY + 54,
    size: 10,
    font: fonteNegrito,
    color: AZUL_SSP,
  });
  const textoData = `Assinado em ${formatarDataAssinatura(assinadoEm)}`;
  pagina.drawText(textoData, {
    x: centralizar(textoData, 8.4),
    y: seloY + 39,
    size: 8.4,
    font: fonteRegular,
    color: rgb(0.12, 0.16, 0.22),
  });
  pagina.drawText(textoAutenticidade, {
    x: centralizar(textoAutenticidade, 7.5),
    y: seloY + 25,
    size: 7.5,
    font: fonteRegular,
    color: rgb(0.12, 0.16, 0.22),
  });
  const textoCodigo = `Código de verificação: ${formatarCodigoVerificacao(token)}`;
  pagina.drawText(textoCodigo, {
    x: centralizar(textoCodigo, 7),
    y: seloY + 11,
    size: 7,
    font: fonteRegular,
    color: rgb(0.12, 0.16, 0.22),
    maxWidth: larguraSelo,
  });

  const tamanhoTextoAutenticidade = 7.5;
  const larguraLink = fonteRegular.widthOfTextAtSize(textoAutenticidade, tamanhoTextoAutenticidade);
  const linkX = centralizar(textoAutenticidade, tamanhoTextoAutenticidade);
  const link = pdf.context.register(
    pdf.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [linkX, seloY + 24, linkX + larguraLink, seloY + 34],
      Border: [0, 0, 0],
      A: { S: 'URI', URI: urlValidacao },
    })
  );
  pagina.node.addAnnot(link);

  return pdf.save();
}
