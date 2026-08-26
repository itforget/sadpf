import QRCode from 'qrcode';
import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function adicionarMarcaDaguaDeAssinatura(
  arquivo: Buffer,
  assinadoEm: Date,
  token: string,
  urlValidacao: string
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(arquivo, { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const qrCode = await QRCode.toBuffer(urlValidacao, {
    errorCorrectionLevel: 'M',
    margin: 0,
    width: 160,
  });
  const qrImage = await pdf.embedPng(qrCode);
  const data = assinadoEm.toLocaleString('pt-BR');

  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    const qrSize = Math.min(42, width * 0.08);
    const footerY = 16;

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
    page.drawText(`Token: ${token}`, {
      x: 24,
      y: footerY + 5,
      size: 5.5,
      font,
      color: rgb(0, 0.3, 0.53),
      opacity: 0.8,
    });
    page.drawImage(qrImage, {
      x: width - qrSize - 24,
      y: footerY,
      width: qrSize,
      height: qrSize,
      opacity: 0.9,
    });
  }

  return pdf.save();
}
