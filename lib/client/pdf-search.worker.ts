import { PDF } from '@libpdf/core';

type SearchRequest = {
  query: string;
  documentos: { id: string; titulo: string; arquivoUrl: string }[];
};

// Process one document at a time off the main thread; retain only page numbers.
self.onmessage = async (event: MessageEvent<SearchRequest>) => {
  const { query, documentos } = event.data;
  const term = query.toLocaleLowerCase('pt-BR');
  const results: Record<string, number[]> = {};
  const failures: string[] = [];
  let withoutText = 0;
  for (const [index, documento] of documentos.entries()) {
    try {
      const response = await fetch(documento.arquivoUrl);
      if (!response.ok) throw new Error('Arquivo indisponível.');
      const pdf = await PDF.load(new Uint8Array(await response.arrayBuffer()));
      const pages = pdf.extractText();
      if (!pages.some((page) => page.text.trim())) withoutText++;
      results[documento.id] = pages
        .filter((page) => page.text.toLocaleLowerCase('pt-BR').includes(term))
        .map((page) => page.pageIndex + 1);
    } catch {
      failures.push(documento.titulo);
    }
    self.postMessage({ type: 'progress', completed: index + 1, total: documentos.length });
  }
  self.postMessage({ type: 'complete', query, results, failures, withoutText });
};
