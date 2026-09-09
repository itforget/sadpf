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
    start: { x: margem, y: seloY + 138 },
    end: { x: width - margem, y: seloY + 138 },
    thickness: 0.7,
    color: AZUL_SSP,
  });
  const tituloAssinatura = 'DOCUMENTO ASSINADO ELETRONICAMENTE';
  pagina.drawText(tituloAssinatura, {
    x: centralizar(tituloAssinatura, 9, fonteNegrito),
    y: seloY + 123,
    size: 9,
    font: fonteNegrito,
    color: AZUL_SSP,
  });

  const logoDimensoes = logo.scaleToFit(38, 38);
  const linhasInstitucionais = 'Secretaria de Estado\nde Segurança Pública\ndo Distrito Federal';
  const larguraInstitucional = Math.max(
    ...linhasInstitucionais.split('\n').map((linha) => fonteRegular.widthOfTextAtSize(linha, 7))
  );
  const larguraGrupoInstitucional = logoDimensoes.width + 10 + larguraInstitucional;
  const grupoInstitucionalX = (width - larguraGrupoInstitucional) / 2;
  pagina.drawImage(logo, {
    x: grupoInstitucionalX,
    y: seloY + 73,
    width: logoDimensoes.width,
    height: logoDimensoes.height,
  });
  const textoInstitucionalX = grupoInstitucionalX + logoDimensoes.width + 10;
  pagina.drawText('SSPDF', {
    x: textoInstitucionalX,
    y: seloY + 101,
    size: 10,
    font: fonteNegrito,
    color: AZUL_SSP,
  });
  pagina.drawText(linhasInstitucionais, {
    x: textoInstitucionalX,
    y: seloY + 89,
    size: 7,
    lineHeight: 8,
    font: fonteRegular,
    color: AZUL_SSP,
  });

  pagina.drawText(tituloAssinatura, {
    x: centralizar(tituloAssinatura, 8, fonteNegrito),
    y: seloY + 57,
    size: 8,
    font: fonteNegrito,
    color: AZUL_SSP,
  });
  const textoData = `Assinado em ${formatarDataAssinatura(assinadoEm)}`;
  pagina.drawText(textoData, {
    x: centralizar(textoData, 7),
    y: seloY + 43,
    size: 7,
    font: fonteRegular,
    color: rgb(0.12, 0.16, 0.22),
  });
  pagina.drawText(textoAutenticidade, {
    x: centralizar(textoAutenticidade, 6.4),
    y: seloY + 30,
    size: 6.4,
    font: fonteRegular,
    color: rgb(0.12, 0.16, 0.22),
  });
  const textoCodigo = `Código de verificação: ${formatarCodigoVerificacao(token)}`;
  pagina.drawText(textoCodigo, {
    x: centralizar(textoCodigo, 6),
    y: seloY + 17,
    size: 6,
    font: fonteRegular,
    color: rgb(0.12, 0.16, 0.22),
    maxWidth: larguraSelo,
  });

  const tamanhoTextoAutenticidade = 6.4;
  const larguraLink = fonteRegular.widthOfTextAtSize(textoAutenticidade, tamanhoTextoAutenticidade);
  const linkX = centralizar(textoAutenticidade, tamanhoTextoAutenticidade);
  const link = pdf.context.register(
    pdf.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [linkX, seloY + 29, linkX + larguraLink, seloY + 37],
      Border: [0, 0, 0],
      A: { S: 'URI', URI: urlValidacao },
    })
  );
  pagina.node.addAnnot(link);

  return pdf.save();
}
