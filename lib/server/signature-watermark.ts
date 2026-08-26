import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function adicionarMarcaDaguaDeAssinatura(
  arquivo: Buffer,
  assinadoEm: Date,
  token: string,
  urlValidacao: string
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(arquivo, { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const data = assinadoEm.toLocaleString('pt-BR');

  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    const footerY = 16;
    const textoToken = `Token: ${token}`;

    page.drawText('ASSINADO ELETRONICAMENTE', {
      x: width * 0.12,
      y: height * 0.42,
      size: Math.min(width / 13, 38),
      font,
      color: rgb(0, 0.3, 0.53),
      opacity: 0.22,
      rotate: degrees(35),
    });
    page.drawText(`SADPF • ${data}`, {
      x: 24,
      y: footerY + 16,
      size: 8,
      font,
      color: rgb(0, 0.3, 0.53),
      opacity: 0.8,
    });
    page.drawText(textoToken, {
      x: 24,
      y: footerY + 5,
      size: 5.5,
      font,
      color: rgb(0, 0.3, 0.53),
      opacity: 0.8,
    });

    const link = pdf.context.register(
      pdf.context.obj({
        Type: 'Annot',
        Subtype: 'Link',
        Rect: [24, footerY + 4, 24 + font.widthOfTextAtSize(textoToken, 5.5), footerY + 12],
        Border: [0, 0, 0],
        A: { S: 'URI', URI: urlValidacao },
      })
    );
    page.node.addAnnot(link);
  }

  return pdf.save();
}
