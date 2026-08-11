import { NextResponse } from 'next/server';
import { getLogs, addLog } from '@/lib/server/db';
import { logSchema } from '@/lib/validations/log';

export async function GET() {
  try {
    const logs = await getLogs();
    return NextResponse.json(logs);
  } catch (error: unknown) {
    console.error('[GET /api/logs]', error);
    return NextResponse.json({ error: 'Erro ao consultar logs de auditoria.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const validationResult = logSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0]?.message || 'Dados inválidos.' },
        { status: 400 }
      );
    }

    const { operador, operadorMatricula, acao, detalhes, ip } = validationResult.data;

    const newLog = await addLog({ operador, operadorMatricula, acao, detalhes, ip });
    return NextResponse.json(newLog, { status: 201 });
  } catch (error: unknown) {
    console.error('[POST /api/logs]', error);
    const message = error instanceof Error ? error.message : 'Erro interno ao registrar log.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
