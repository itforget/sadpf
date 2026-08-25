import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { addEncaminhamento, getEncaminhamentos } from '@/lib/server/db';
import { getVerifiedSession, isSameOriginMutation } from '@/lib/server/access';
import { encaminhamentoSchema } from '@/lib/validations/encaminhamento';

export async function GET() {
  try {
    if (!(await getVerifiedSession())) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    return NextResponse.json(await getEncaminhamentos());
  } catch (error) {
    console.error('[GET /api/encaminhamentos]', error);
    return NextResponse.json({ error: 'Erro ao consultar encaminhamentos.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isSameOriginMutation(request)) {
      return NextResponse.json({ error: 'Origem da requisição inválida.' }, { status: 403 });
    }
    const session = await getVerifiedSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = encaminhamentoSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0]?.message || 'Dados inválidos.' },
        { status: 400 }
      );
    }

    if (typeof body.servidorId !== 'string' || body.servidorId.length === 0) {
      return NextResponse.json({ error: 'Servidor é obrigatório.' }, { status: 400 });
    }
    if (body.documentoId !== undefined && typeof body.documentoId !== 'string') {
      return NextResponse.json({ error: 'Documento inválido.' }, { status: 400 });
    }

    const data = validationResult.data;
    const encaminhamento = await addEncaminhamento({
      servidorId: body.servidorId,
      documentoId: body.documentoId,
      destinatario: data.destinatario,
      justificativa: data.justificativa,
      validadeDias: Number(data.validadeDias),
      requerSenha: data.requerSenha,
      token: randomBytes(32).toString('base64url'),
      operador: typeof session.nome === 'string' ? session.nome : 'Operador não identificado',
      operadorMatricula: typeof session.matricula === 'string' ? session.matricula : 'N/A',
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'N/A',
    });

    return NextResponse.json(encaminhamento, { status: 201 });
  } catch (error) {
    console.error('[POST /api/encaminhamentos]', error);
    const message = error instanceof Error ? error.message : 'Erro ao criar encaminhamento.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
