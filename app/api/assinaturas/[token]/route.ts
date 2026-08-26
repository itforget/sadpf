import { NextRequest, NextResponse } from 'next/server';
import { assinarEletronicamente } from '@/lib/server/db';
import { isSameOriginMutation } from '@/lib/server/access';
import { getRequestIp } from '@/lib/server/request-ip';

export async function POST(
  request: NextRequest,
  context: RouteContext<'/api/assinaturas/[token]'>
) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: 'Origem da requisição inválida.' }, { status: 403 });
  }

  const { token } = await context.params;
  const result = await assinarEletronicamente(token, getRequestIp(request));
  if (result.status === 'assinado') return NextResponse.json(result);
  const messages = {
    invalido: 'Solicitação de assinatura inválida.',
    expirado: 'Este link de assinatura expirou.',
    indisponivel: 'Esta solicitação já foi processada.',
  };
  return NextResponse.json({ error: messages[result.status] }, { status: 400 });
}
