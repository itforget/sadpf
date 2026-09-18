import { NextRequest, NextResponse } from 'next/server';
import { signSignature } from '@/lib/server/signature-service';
import { isSameOriginMutation } from '@/lib/server/access';
import { getRequestIp } from '@/lib/server/request-ip';

export async function POST(
  request: NextRequest,
  context: RouteContext<'/api/assinaturas/[token]'>
) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: 'Origem da requisição inválida.' }, { status: 403 });
  }

  const body = (await request.json()) as { cpf?: unknown };
  if (typeof body.cpf !== 'string' || body.cpf.replace(/\D/g, '').length !== 11) {
    return NextResponse.json({ error: 'Informe o CPF com 11 dígitos.' }, { status: 400 });
  }
  const { token } = await context.params;
  const result = await signSignature(token, body.cpf, getRequestIp(request));
  if (result.status === 'assinado') return NextResponse.json(result);
  const messages = {
    invalido: 'Solicitação de assinatura inválida.',
    expirado: 'Este link de assinatura expirou.',
    indisponivel: 'Esta solicitação já foi processada.',
    cpf_invalido: 'O CPF informado não corresponde ao servidor destinatário.',
  };
  return NextResponse.json(
    { error: messages[result.status] },
    { status: result.status === 'expirado' ? 410 : 400 }
  );
}
