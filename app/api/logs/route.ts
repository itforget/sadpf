import { NextRequest, NextResponse } from 'next/server';
import { getLogs, getLogsPage, addLog } from '@/lib/server/repositories/auditoria';
import { auditLogSchema } from '@/lib/validations/log';
import { getVerifiedSession, isSameOriginMutation } from '@/lib/server/access';
import { parsePage } from '@/lib/pagination';
import { AcaoAuditoria } from '@/prisma/generated';
import { getRequestIp } from '@/lib/server/request-ip';

export async function GET(request: NextRequest) {
  try {
    const session = await getVerifiedSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    if (request.nextUrl.searchParams.has('page')) {
      const action = request.nextUrl.searchParams.get('action');
      if (action && !Object.values(AcaoAuditoria).includes(action as AcaoAuditoria)) {
        return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
      }
      return NextResponse.json(
        await getLogsPage({
          page: parsePage(request.nextUrl.searchParams.get('page')),
          search: request.nextUrl.searchParams.get('search') ?? undefined,
          action: action ? (action as AcaoAuditoria) : undefined,
        })
      );
    }
    const logs = await getLogs();
    return NextResponse.json(logs);
  } catch (error: unknown) {
    console.error('[GET /api/logs]', error);
    return NextResponse.json({ error: 'Erro ao consultar logs de auditoria.' }, { status: 500 });
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
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const body = await request.json();

    const validationResult = auditLogSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0]?.message || 'Dados inválidos.' },
        { status: 400 }
      );
    }

    const { acao, detalhes } = validationResult.data;

    const newLog = await addLog({
      operador: typeof session.nome === 'string' ? session.nome : 'Operador não identificado',
      operadorMatricula: typeof session.matricula === 'string' ? session.matricula : 'N/A',
      acao,
      detalhes,
      ip: getRequestIp(request),
    });
    return NextResponse.json(newLog, { status: 201 });
  } catch (error: unknown) {
    console.error('[POST /api/logs]', error);
    const message = error instanceof Error ? error.message : 'Erro interno ao registrar log.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
