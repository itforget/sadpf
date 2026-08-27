import { NextRequest, NextResponse } from 'next/server';
import { getServidorById } from '@/lib/server/repositories/servidor';
import { getVerifiedSession, isSameOriginMutation } from '@/lib/server/access';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { signedUploadSchema } from '@/lib/server/document-upload';
import { prepareDirectUpload } from '@/lib/server/upload-service';

export async function POST(request: NextRequest) {
  try {
    if (!isSameOriginMutation(request)) {
      return NextResponse.json({ error: 'Origem da requisição inválida.' }, { status: 403 });
    }
    const session = await getVerifiedSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    const rateLimit = checkRateLimit(`signed-upload:${session.id}`, 30, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Limite de preparações de upload atingido. Tente novamente mais tarde.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
      );
    }

    if ((process.env.STORAGE_PROVIDER || 'local').toLowerCase() !== 'supabase') {
      return NextResponse.json(
        {
          error: 'Upload direto está disponível apenas quando o storage Supabase está configurado.',
        },
        { status: 409 }
      );
    }

    const validation = signedUploadSchema.safeParse(await request.json());
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Dados inválidos.' },
        { status: 400 }
      );
    }

    const data = validation.data;
    if (!data.fileName.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Somente arquivos PDF são permitidos.' }, { status: 400 });
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

    return NextResponse.json(await prepareDirectUpload(servidor.id));
  } catch (error: unknown) {
    console.error('[POST /api/upload/assinar]', error);
    const message = error instanceof Error ? error.message : 'Erro ao preparar upload do arquivo.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
