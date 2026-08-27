import { NextRequest, NextResponse } from 'next/server';
import { getServidorById } from '@/lib/server/repositories/servidor';
import { getStorage } from '@/lib/storage';
import { getVerifiedSession, isSameOriginMutation } from '@/lib/server/access';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { getRequestIp } from '@/lib/server/request-ip';
import {
  completeUploadSchema,
  documentCategory,
  isDocumentStorageKey,
  isPDF,
  MAX_DOCUMENT_SIZE,
} from '@/lib/server/document-upload';
import { persistUploadedDocument } from '@/lib/server/upload-service';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    if (!isSameOriginMutation(request)) {
      return NextResponse.json({ error: 'Origem da requisição inválida.' }, { status: 403 });
    }
    const session = await getVerifiedSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    const rateLimit = checkRateLimit(`upload-confirm:${session.id}`, 20, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Limite de confirmações de upload atingido. Tente novamente mais tarde.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
      );
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
      return NextResponse.json({ error: 'Arquivo deve ter no máximo 50 MB.' }, { status: 400 });
    }
    if (!isPDF(data.fileName, 'application/pdf', buffer)) {
      await storage.delete(data.storageKey);
      return NextResponse.json(
        { error: 'O conteúdo enviado não é um PDF válido.' },
        { status: 400 }
      );
    }

    const doc = await persistUploadedDocument({
      buffer,
      fileSize: buffer.byteLength,
      servidorId: data.servidorId,
      servidorNome: servidor.nome,
      servidorMatricula: servidor.matricula,
      titulo: data.titulo,
      categoria: documentCategory(data.categoria),
      processoSEI: data.processoSEI || undefined,
      storageKey: data.storageKey,
      storageBackend: storage.backend,
      operador: typeof session.nome === 'string' ? session.nome : 'Operador não identificado',
      operadorMatricula: typeof session.matricula === 'string' ? session.matricula : 'N/A',
      ip: getRequestIp(request),
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (error: unknown) {
    console.error('[POST /api/upload/confirmar]', error);
    const message = error instanceof Error ? error.message : 'Erro ao confirmar upload do arquivo.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
