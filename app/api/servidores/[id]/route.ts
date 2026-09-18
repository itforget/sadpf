import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedSession, isSameOriginMutation } from '@/lib/server/access';
import { getDocumentosByServidor } from '@/lib/server/repositories/documento';
import { getServidorById, updateServidor } from '@/lib/server/repositories/servidor';
import { getRequestIp } from '@/lib/server/request-ip';
import { alertaSchema } from '@/lib/validations/alerta';

export async function GET(request: NextRequest, context: RouteContext<'/api/servidores/[id]'>) {
  const session = await getVerifiedSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const servidor = await getServidorById(id);
    if (!servidor) {
      return NextResponse.json({ error: 'Servidor não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({
      servidor,
      documentos: await getDocumentosByServidor(servidor.id),
    });
  } catch (error) {
    console.error('[GET /api/servidores/[id]]', error);
    return NextResponse.json({ error: 'Erro ao consultar servidor.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext<'/api/servidores/[id]'>) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: 'Origem inválida.' }, { status: 403 });
  }

  try {
    const session = await getVerifiedSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    if (!['ADMIN', 'OPERADOR'].includes(session.role)) {
      return NextResponse.json({ error: 'Sem permissão para editar alertas.' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const result = alertaSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message ?? 'Alerta inválido.' },
        { status: 400 }
      );
    }

    const { id } = await context.params;
    const atual = await getServidorById(id);
    if (!atual) {
      return NextResponse.json({ error: 'Servidor não encontrado.' }, { status: 404 });
    }

    const servidor = await updateServidor(atual.id, result.data, {
      operador: session.nome,
      operadorMatricula: session.matricula,
      acao: 'ATUALIZACAO',
      detalhes: `${result.data.alerta ? 'Atualizou' : 'Removeu'} o alerta cadastral de ${
        atual.nome
      } (matrícula ${atual.matricula}).`,
      ip: getRequestIp(request),
    });
    return NextResponse.json(servidor);
  } catch (error) {
    console.error('[PATCH /api/servidores/[id]]', error);
    return NextResponse.json({ error: 'Erro ao salvar alerta.' }, { status: 500 });
  }
}
