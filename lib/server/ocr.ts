import { readFile } from 'fs/promises';

export async function extractTextFromPDF(input: string | Buffer) {
  let buffer: Buffer;
  if (typeof input === 'string') {
    buffer = await readFile(input);
  } else {
    buffer = input;
  }

  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: buffer });
  const textResult = await parser.getText();
  await parser.destroy();

  return {
    text: (textResult.text || '').toString().trim(),
    numpages: textResult.pages.length || 1,
  };
}
export async function enqueueOCR(doc: { id: string; arquivo_url: string }) {
  console.log('OCR enfileirado:', doc.id);

  return {
    jobId: `ocr-${doc.id}`,
  };
}
