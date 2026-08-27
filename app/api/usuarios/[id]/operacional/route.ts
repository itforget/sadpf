import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { getVerifiedSession, isSameOriginMutation } from '@/lib/server/access';
import { getRequestIp } from '@/lib/server/request-ip';
import { getServidorById, updateServidor } from '@/lib/server/repositories/servidor';
import { usuarioOperacionalSchema } from '@/lib/validations/servidor';

/** Atualiza somente os controles operacionais de uma conta, nunca seu cadastro pessoal. */
export async function PUT(
  request: Request,
  context: RouteContext<'/api/usuarios/[id]/operacional'>
) {
  try {
    if (!isSameOriginMutation(request)) {
      return NextResponse.json({ error: 'Origem da requisição inválida.' }, { status: 403 });
    }
    const session = await getVerifiedSession();
    if (session?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Somente administradores podem alterar controles de acesso.' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const validationResult = usuarioOperacionalSchema.safeParse(await request.json());
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0]?.message || 'Dados inválidos.' },
        { status: 400 }
      );
    }

    const servidor = await getServidorById(id);
    if (!servidor) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    const data = validationResult.data;
    const senhaHash = data.senha ? await bcrypt.hash(data.senha, 12) : undefined;
    const updated = await updateServidor(
      id,
      { status: data.status, role: data.role, senhaHash },
      {
        operador: String(session.nome),
        operadorMatricula: String(session.matricula),
        acao: 'ATUALIZACAO',
        detalhes: `Atualizou os controles de acesso de ${servidor.nome} (Mat. ${servidor.matricula}).`,
        ip: getRequestIp(request),
      }
    );
    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error('[PUT /api/usuarios/[id]/operacional]', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar os controles de acesso.' },
      { status: 500 }
    );
  }
}
