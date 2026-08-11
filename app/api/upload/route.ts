import { NextResponse } from 'next/server';
import type { DocumentoPDF } from '@/lib/types';
import { addDocumento, addLog } from '@/lib/server/db';
import { enqueueOCR, extractTextFromPDF } from '@/lib/server/ocr';
import { getStorage } from '@/lib/storage';

const categoriasOCR: DocumentoPDF['categoria'][] = [
  'Dados Pessoais',
  'Posse e Exercício',
  'Vida Funcional',
  'Licenças e Afastamentos',
  'Avaliação de Desempenho',
];

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const file = formData.get('file') as File | null;
    const servidorId = formData.get('servidorId') as string | null;
    const titulo = (formData.get('titulo') as string) || file?.name || 'Documento.pdf';
    const rawCategoria = (formData.get('categoria') as string) || 'Vida Funcional';
    const categoria = categoriasOCR.includes(rawCategoria as DocumentoPDF['categoria'])
      ? (rawCategoria as DocumentoPDF['categoria'])
      : 'Vida Funcional';
    const processoSEI = (formData.get('processoSEI') as string) || undefined;
    const operadorNome = (formData.get('operadorNome') as string) || '';
    const operadorMatricula = (formData.get('operadorMatricula') as string) || '';
    const operadorIp = (formData.get('operadorIp') as string) || '';

    if (!file) {
      return NextResponse.json({ error: 'Arquivo PDF não fornecido.' }, { status: 400 });
    }

    if (!servidorId) {
      return NextResponse.json({ error: 'servidorId é obrigatório.' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Somente arquivos no formato PDF são permitidos.' },
        { status: 400 }
      );
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Arquivo deve ter no máximo 50MB.' }, { status: 400 });
    }

    const timestamp = Date.now();
    const safeFilename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const storage = getStorage();
    const uploadRes = await storage.upload(buffer, safeFilename, file.type);
    const arquivoUrl = uploadRes.url;

    let textoOCR = '';
    let paginas = 1;
    try {
      const ocrResult = await extractTextFromPDF(buffer);
      textoOCR = ocrResult.text;
      paginas = ocrResult.numpages;
    } catch (ocrError: unknown) {
      console.error('[upload] falha ao extrair texto OCR:', ocrError);
    }

    const doc = await addDocumento({
      servidorId,
      titulo,
      categoria,
      dataUpload: new Date().toLocaleDateString('pt-BR'),
      tamanho: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      paginas,
      processoSEI,
      arquivoUrl,
      textoOCR,
      operadorRH: operadorNome,
    });

    await enqueueOCR({ id: doc.id, arquivo_url: arquivoUrl }).catch((error) => {
      console.error('[upload] erro ao enfileirar OCR:', error);
    });

    if (operadorNome && operadorMatricula && operadorIp) {
      await addLog({
        operador: operadorNome,
        operadorMatricula,
        acao: 'UPLOAD',
        detalhes: `Anexou documento PDF '${titulo}' na pasta do servidor ${servidorId}`,
        ip: operadorIp,
      }).catch((err) => console.error('[upload] erro ao registrar log:', err));
    }

    return NextResponse.json(doc, { status: 201 });
  } catch (error: unknown) {
    console.error('[POST /api/upload]', error);
    const message = error instanceof Error ? error.message : 'Erro durante o upload do arquivo.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
