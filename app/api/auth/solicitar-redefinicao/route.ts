import { NextResponse } from 'next/server';
import { isSameOriginMutation } from '@/lib/server/access';
import { requestPasswordReset } from '@/lib/server/password-reset';
import { checkRateLimit, getRateLimitKey } from '@/lib/server/rate-limit';
import { passwordResetRequestSchema } from '@/lib/validations/auth';

const GENERIC_RESPONSE = {
  message: 'Se houver uma conta ativa para este e-mail, enviaremos um link de redefinição.',
};

export async function POST(request: Request) {
  try {
    if (!isSameOriginMutation(request)) {
      return NextResponse.json({ error: 'Origem da requisição inválida.' }, { status: 403 });
    }
    const rateLimit = checkRateLimit(
      getRateLimitKey(request, 'password-reset-request'),
      5,
      15 * 60 * 1000
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Muitas solicitações. Tente novamente mais tarde.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
      );
    }

    const validationResult = passwordResetRequestSchema.safeParse(await request.json());
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0]?.message || 'Dados inválidos.' },
        { status: 400 }
      );
    }

    await requestPasswordReset(validationResult.data.email);
    return NextResponse.json(GENERIC_RESPONSE);
  } catch (error) {
    console.error('[POST /api/auth/solicitar-redefinicao]', error);
    return NextResponse.json(
      { error: 'Não foi possível solicitar a redefinição.' },
      { status: 500 }
    );
  }
}
