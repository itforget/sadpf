import { readFile } from 'fs/promises';

const OCR_LANGUAGE = process.env.OCR_LANGUAGE?.trim() || 'por';
const OCR_CACHE_PATH = '/tmp/sadpf-tesseract-cache';
const OCR_RENDER_WIDTH = 2000;

export async function extractTextFromPDF(input: string | Buffer) {
  let buffer: Buffer;
  if (typeof input === 'string') {
    buffer = await readFile(input);
  } else {
    buffer = input;
  }

  let numpages: number | null = null;
  try {
    const { PDFDocument } = await import('pdf-lib');
    const document = await PDFDocument.load(buffer, { ignoreEncryption: true });
    numpages = document.getPageCount();
  } catch (pageCountError) {
    console.error('[ocr] falha ao contar páginas pela estrutura do PDF:', pageCountError);
  }

  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: buffer });

  try {
    const textResult = await parser.getText();
    numpages ??= Math.max(1, textResult.total || textResult.pages.length);
    const pageTexts = new Map(textResult.pages.map((page) => [page.num, page.text.trim()]));
    const pagesWithoutText = Array.from({ length: numpages }, (_, index) => index + 1).filter(
      (pageNumber) => !pageTexts.get(pageNumber)
    );

    if (pagesWithoutText.length > 0) {
      try {
        const screenshots = await parser.getScreenshot({
          partial: pagesWithoutText,
          desiredWidth: OCR_RENDER_WIDTH,
          imageBuffer: true,
          imageDataUrl: false,
        });
        const { createWorker } = await import('tesseract.js');
        const worker = await createWorker(OCR_LANGUAGE, undefined, {
          cachePath: OCR_CACHE_PATH,
        });

        try {
          for (const screenshot of screenshots.pages) {
            const { data } = await worker.recognize(Buffer.from(screenshot.data));
            pageTexts.set(screenshot.pageNumber, data.text.trim());
          }
        } finally {
          await worker.terminate();
        }
      } catch (ocrError) {
        console.error('[ocr] falha ao reconhecer páginas digitalizadas:', ocrError);
      }
    }

    const text = Array.from({ length: numpages }, (_, index) => {
      const pageNumber = index + 1;
      const pageText = pageTexts.get(pageNumber);
      return pageText ? `--- Página ${pageNumber} ---\n${pageText}` : '';
    })
      .filter(Boolean)
      .join('\n\n');

    return { text, numpages };
  } catch (textExtractionError) {
    if (numpages !== null) {
      console.error('[ocr] falha ao extrair o texto do PDF:', textExtractionError);
      return { text: '', numpages };
    }
    throw textExtractionError;
  } finally {
    await parser.destroy();
  }
}
