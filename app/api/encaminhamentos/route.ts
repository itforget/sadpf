import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  addEncaminhamento,
  getDocumentoById,
  getEncaminhamentos,
  getServidorById,
} from '@/lib/server/db';
import { getVerifiedSession, isSameOriginMutation } from '@/lib/server/access';
import { encaminhamentoSchema } from '@/lib/validations/encaminhamento';
import { getRequestIp } from '@/lib/server/request-ip';
import { sendSignatureRequestEmail } from '@/lib/server/email';

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
    if (typeof body.documentoId !== 'string' || body.documentoId.length === 0) {
      return NextResponse.json({ error: 'Documento inválido.' }, { status: 400 });
    }

    const data = validationResult.data;
    const encaminhamento = await addEncaminhamento({
      servidorId: body.servidorId,
      documentoId: body.documentoId,
      validadeDias: Number(data.validadeDias),
      token: randomBytes(32).toString('base64url'),
      operador: typeof session.nome === 'string' ? session.nome : 'Operador não identificado',
      operadorMatricula: typeof session.matricula === 'string' ? session.matricula : 'N/A',
      ip: getRequestIp(request),
    });

    const applicationUrl = (process.env.APP_URL || new URL(request.url).origin).replace(/\/$/, '');
    const assinaturaUrl = `${applicationUrl}/assinar/${encaminhamento.token}`;
    let emailSent = true;
    try {
      const [servidor, documento] = await Promise.all([
        getServidorById(body.servidorId),
        getDocumentoById(body.documentoId),
      ]);
      if (!servidor || !documento) throw new Error('Destinatário ou documento não encontrado.');
      await sendSignatureRequestEmail({
        recipient: servidor.email,
        recipientName: servidor.nome,
        documentTitle: documento.titulo,
        signatureUrl: assinaturaUrl,
        expiresAt: new Date(Date.now() + Number(data.validadeDias) * 24 * 60 * 60 * 1000),
      });
    } catch (emailError) {
      console.error('[assinatura] falha ao enviar e-mail:', emailError);
      emailSent = false;
    }

    return NextResponse.json({ ...encaminhamento, emailSent }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/encaminhamentos]', error);
    const message = error instanceof Error ? error.message : 'Erro ao criar encaminhamento.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
