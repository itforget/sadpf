import { NextRequest, NextResponse } from 'next/server';

import { getVerifiedSession, isSameOriginMutation } from '@/lib/server/access';
import { addLog, getDocumentoById } from '@/lib/server/db';
import { getRequestIp } from '@/lib/server/request-ip';

export async function POST(
  request: NextRequest,
  context: RouteContext<'/api/documentos/[id]/impressao'>
) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: 'Origem da requisição inválida.' }, { status: 403 });
  }

  const session = await getVerifiedSession(request);
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { id } = await context.params;
  const documento = await getDocumentoById(id);
  if (!documento) return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 });

  await addLog({
    operador: session.nome,
    operadorMatricula: session.matricula,
    acao: 'IMPRESSAO',
    detalhes: `Imprimiu o documento '${documento.titulo}' (ID ${documento.id}).`,
    ip: getRequestIp(request),
  });

  return NextResponse.json({ ok: true });
}
