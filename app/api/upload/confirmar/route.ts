import { NextRequest, NextResponse } from 'next/server';
import type { DocumentoPDF } from '@/lib/types';
import { addDocumento, addLog, getServidorById } from '@/lib/server/db';
import { enqueueOCR, extractTextFromPDF } from '@/lib/server/ocr';
import { getStorage } from '@/lib/storage';
import { getSessionFromToken, getSessionToken } from '@/lib/server/auth';
import { getRequestIp } from '@/lib/server/request-ip';
import {
  completeUploadSchema,
  documentCategory,
  isDocumentStorageKey,
  isPDF,
  MAX_DOCUMENT_SIZE,
} from '@/lib/server/document-upload';

export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromToken(await getSessionToken(request));
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const validation = completeUploadSchema.safeParse(await request.json());
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Dados inválidos.' },
        { status: 400 }
      );
    }

    const data = validation.data;
    if (!isDocumentStorageKey(data.storageKey, data.servidorId)) {
      return NextResponse.json({ error: 'Arquivo de upload inválido.' }, { status: 400 });
    }

    const servidor = await getServidorById(data.servidorId);
    if (!servidor) {
      return NextResponse.json({ error: 'Servidor não encontrado.' }, { status: 404 });
    }
    if (servidor.status !== 'Ativo') {
      return NextResponse.json(
        { error: 'Documentos só podem ser incluídos em pastas funcionais de servidores ativos.' },
        { status: 400 }
      );
    }

    const storage = getStorage();
    if (storage.backend !== 'supabase') {
      return NextResponse.json(
        { error: 'Storage Supabase não está configurado.' },
        { status: 409 }
      );
    }

    const buffer = await storage.download(data.storageKey);
    if (buffer.byteLength > MAX_DOCUMENT_SIZE) {
      await storage.delete(data.storageKey);
      return NextResponse.json({ error: 'Arquivo deve ter no máximo 100MB.' }, { status: 400 });
    }
    if (!isPDF(data.fileName, 'application/pdf', buffer)) {
      await storage.delete(data.storageKey);
      return NextResponse.json(
        { error: 'O conteúdo enviado não é um PDF válido.' },
        { status: 400 }
      );
    }

    let textoOCR = '';
    let paginas = 1;
    try {
      const ocrResult = await extractTextFromPDF(buffer);
      textoOCR = ocrResult.text;
      paginas = ocrResult.numpages;
    } catch (ocrError: unknown) {
      console.error('[upload] falha ao extrair texto OCR:', ocrError);
    }

    let doc: DocumentoPDF;
    try {
      doc = await addDocumento({
        servidorId: data.servidorId,
        titulo: data.titulo,
        categoria: documentCategory(data.categoria),
        dataUpload: new Date().toLocaleDateString('pt-BR'),
        tamanho: `${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB`,
        paginas,
        processoSEI: data.processoSEI || undefined,
        arquivoUrl: data.storageKey,
        storageBackend: storage.backend,
        storageKey: data.storageKey,
        textoOCR,
        operadorRH: typeof session.nome === 'string' ? session.nome : 'Operador não identificado',
      });
    } catch (error) {
      await storage.delete(data.storageKey);
      throw error;
    }

    await enqueueOCR({ id: doc.id, arquivo_url: data.storageKey }).catch((error) => {
      console.error('[upload] erro ao enfileirar OCR:', error);
    });

    await addLog({
      operador: typeof session.nome === 'string' ? session.nome : 'Operador não identificado',
      operadorMatricula: typeof session.matricula === 'string' ? session.matricula : 'N/A',
      acao: 'UPLOAD',
      detalhes: `Anexou documento PDF '${data.titulo}' na pasta do servidor ${servidor.nome} (Mat. ${servidor.matricula})`,
      ip: getRequestIp(request),
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (error: unknown) {
    console.error('[POST /api/upload/confirmar]', error);
    const message = error instanceof Error ? error.message : 'Erro ao confirmar upload do arquivo.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
