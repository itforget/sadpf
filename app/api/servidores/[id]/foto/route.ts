import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { addLog, getFotoServidorById, getServidorById, updateFotoServidor } from '@/lib/server/db';
import { getVerifiedSession, isSameOriginMutation } from '@/lib/server/access';
import { getStorage } from '@/lib/storage';
import { getRequestIp } from '@/lib/server/request-ip';

const TIPOS_PERMITIDOS = new Set(['image/png', 'image/jpeg']);

function isValidImage(buffer: Buffer, mimeType: string) {
  if (mimeType === 'image/png') {
    return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  return mimeType === 'image/jpeg' && buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
}

async function sessaoAutorizada(request: NextRequest) {
  const session = await getVerifiedSession(request);
  return session && ['ADMIN', 'OPERADOR'].includes(String(session.role)) ? session : null;
}

export async function GET(
  request: NextRequest,
  context: RouteContext<'/api/servidores/[id]/foto'>
) {
  const session = await sessaoAutorizada(request);
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  try {
    const { id } = await context.params;
    const foto = await getFotoServidorById(id);
    if (!foto) return NextResponse.json({ error: 'Servidor não encontrado.' }, { status: 404 });
    if (!foto.fotoStorageKey || !foto.fotoStorageBackend) {
      return NextResponse.json({ error: 'Foto não encontrada.' }, { status: 404 });
    }

    const arquivo = await getStorage(foto.fotoStorageBackend).download(foto.fotoStorageKey);
    return new NextResponse(new Uint8Array(arquivo), {
      headers: {
        'Content-Type': foto.fotoMimeType || 'image/jpeg',
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[GET /api/servidores/[id]/foto]', error);
    return NextResponse.json({ error: 'Não foi possível carregar a foto.' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext<'/api/servidores/[id]/foto'>
) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: 'Origem da requisição inválida.' }, { status: 403 });
  }
  const session = await sessaoAutorizada(request);
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  try {
    const { id } = await context.params;
    const servidor = await getServidorById(id);
    if (!servidor) return NextResponse.json({ error: 'Servidor não encontrado.' }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get('foto');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Arquivo de foto não enviado.' }, { status: 400 });
    }
    if (!TIPOS_PERMITIDOS.has(file.type)) {
      return NextResponse.json({ error: 'Envie uma imagem PNG ou JPEG.' }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'A foto deve ter no máximo 5 MB.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!isValidImage(buffer, file.type)) {
      return NextResponse.json(
        { error: 'O conteúdo enviado não é uma imagem válida.' },
        { status: 400 }
      );
    }
    const extensao = file.type === 'image/png' ? 'png' : 'jpg';
    const storageKey = `fotos/servidores/${id}/${randomBytes(24).toString('hex')}.${extensao}`;
    const storage = getStorage();
    const stored = await storage.upload(buffer, storageKey, file.type);
    const antiga = await getFotoServidorById(id);

    await updateFotoServidor(id, {
      fotoUrl: null,
      fotoStorageBackend: stored.backend.toUpperCase() as 'LOCAL' | 'SUPABASE' | 'S3',
      fotoStorageKey: stored.key,
      fotoMimeType: file.type,
    });

    if (antiga?.fotoStorageKey && antiga.fotoStorageBackend) {
      await getStorage(antiga.fotoStorageBackend)
        .delete(antiga.fotoStorageKey)
        .catch((error) =>
          console.error('[POST /api/servidores/[id]/foto] erro ao remover foto anterior:', error)
        );
    }

    await addLog({
      operador: String(session.nome),
      operadorMatricula: String(session.matricula),
      acao: 'ATUALIZACAO',
      detalhes: `Atualizou a foto do servidor ${servidor.nome} (Mat. ${servidor.matricula})`,
      ip: getRequestIp(request),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[POST /api/servidores/[id]/foto]', error);
    return NextResponse.json({ error: 'Não foi possível salvar a foto.' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext<'/api/servidores/[id]/foto'>
) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: 'Origem da requisição inválida.' }, { status: 403 });
  }
  const session = await sessaoAutorizada(request);
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  try {
    const { id } = await context.params;
    const foto = await getFotoServidorById(id);
    if (!foto) return NextResponse.json({ error: 'Servidor não encontrado.' }, { status: 404 });
    await updateFotoServidor(id, {
      fotoUrl: null,
      fotoStorageBackend: null,
      fotoStorageKey: null,
      fotoMimeType: null,
    });
    if (foto.fotoStorageKey && foto.fotoStorageBackend) {
      await getStorage(foto.fotoStorageBackend).delete(foto.fotoStorageKey);
    }
    await addLog({
      operador: String(session.nome),
      operadorMatricula: String(session.matricula),
      acao: 'ATUALIZACAO',
      detalhes: `Removeu a foto do servidor ${id}.`,
      ip: getRequestIp(request),
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[DELETE /api/servidores/[id]/foto]', error);
    return NextResponse.json({ error: 'Não foi possível remover a foto.' }, { status: 500 });
  }
}
