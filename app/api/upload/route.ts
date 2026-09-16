import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { DocumentoPDF } from '@/lib/types';
import { getServidorById } from '@/lib/server/repositories/servidor';
import { getStorage } from '@/lib/storage';
import { getVerifiedSession, isSameOriginMutation } from '@/lib/server/access';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { getRequestIp } from '@/lib/server/request-ip';
import { CATEGORIAS_DOCUMENTO } from '@/lib/documentos';
import { persistUploadedDocument } from '@/lib/server/upload-service';

const categoriasDocumento = CATEGORIAS_DOCUMENTO;

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
    const rateLimit = checkRateLimit(`upload:${session.id}`, 20, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Limite de uploads atingido. Tente novamente mais tarde.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
      );
    }

    const formData = await request.formData();

    const file = formData.get('file') as File | null;
    const servidorId = formData.get('servidorId') as string | null;
    const titulo = (formData.get('titulo') as string) || file?.name || 'Documento.pdf';
    const rawCategoria = (formData.get('categoria') as string) || 'Pasta Física Digitalizada';
    const categoria = categoriasDocumento.includes(rawCategoria as DocumentoPDF['categoria'])
      ? (rawCategoria as DocumentoPDF['categoria'])
      : 'Pasta Física Digitalizada';
    const processoSEI = (formData.get('processoSEI') as string) || undefined;

    if (!file) {
      return NextResponse.json({ error: 'Arquivo PDF não fornecido.' }, { status: 400 });
    }

    if (!servidorId) {
      return NextResponse.json({ error: 'servidorId é obrigatório.' }, { status: 400 });
    }

    const servidor = await getServidorById(servidorId);
    if (!servidor) {
      return NextResponse.json({ error: 'Servidor não encontrado.' }, { status: 404 });
    }

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Somente arquivos no formato PDF são permitidos.' },
        { status: 400 }
      );
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Arquivo deve ter no máximo 50 MB.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
      return NextResponse.json(
        { error: 'O conteúdo enviado não é um PDF válido.' },
        { status: 400 }
      );
    }

    const storageKey = `documentos/${servidor.id}/${randomBytes(24).toString('hex')}.pdf`;

    const storage = getStorage();
    const storedFile = await storage.upload(buffer, storageKey, file.type);

    const doc = await persistUploadedDocument({
      buffer,
      fileSize: file.size,
      servidorId,
      servidorNome: servidor.nome,
      servidorMatricula: servidor.matricula,
      titulo,
      categoria,
      processoSEI,
      storageKey: storedFile.key,
      storageBackend: storedFile.backend,
      operador: typeof session.nome === 'string' ? session.nome : 'Operador não identificado',
      operadorMatricula: typeof session.matricula === 'string' ? session.matricula : 'N/A',
      ip: getRequestIp(request),
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (error: unknown) {
    console.error('[POST /api/upload]', error);
    const message = error instanceof Error ? error.message : 'Erro durante o upload do arquivo.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
