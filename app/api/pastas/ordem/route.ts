import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedSession, isSameOriginMutation } from '@/lib/server/access';
import { addLog, getServidorById, reordenarDocumentosDoServidor } from '@/lib/server/db';
import { getRequestIp } from '@/lib/server/request-ip';

export async function PATCH(request: NextRequest) {
  try {
    if (!isSameOriginMutation(request)) {
      return NextResponse.json({ error: 'Origem da requisição inválida.' }, { status: 403 });
    }
    const session = await getVerifiedSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const body = await request.json();
    const servidorId = typeof body.servidorId === 'string' ? body.servidorId : '';
    const documentoIds = Array.isArray(body.documentoIds)
      ? body.documentoIds.filter((id: unknown): id is string => typeof id === 'string')
      : [];

    if (!servidorId || documentoIds.length === 0) {
      return NextResponse.json({ error: 'Dados para ordenação inválidos.' }, { status: 400 });
    }

    const servidor = await getServidorById(servidorId);
    if (!servidor) {
      return NextResponse.json({ error: 'Servidor não encontrado.' }, { status: 404 });
    }

    const reordenado = await reordenarDocumentosDoServidor(servidor.id, documentoIds);
    if (!reordenado) {
      return NextResponse.json(
        { error: 'A lista de documentos não corresponde à pasta selecionada.' },
        { status: 400 }
      );
    }

    await addLog({
      operador: String(session.nome),
      operadorMatricula: String(session.matricula),
      acao: 'ATUALIZACAO',
      detalhes: `Reorganizou a ordem dos documentos da pasta funcional de ${servidor.nome} (Mat. ${servidor.matricula})`,
      ip: getRequestIp(request),
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[PATCH /api/pastas/ordem]', error);
    return NextResponse.json(
      { error: 'Não foi possível salvar a ordem dos documentos.' },
      { status: 500 }
    );
  }
}
