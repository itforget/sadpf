import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { passwordResetSchema } from '@/lib/validations/auth';
import { resetPassword } from '@/lib/server/password-reset';
import { isSameOriginMutation } from '@/lib/server/access';
import { checkRateLimit, getRateLimitKey } from '@/lib/server/rate-limit';

export async function POST(request: Request) {
  try {
    if (!isSameOriginMutation(request)) {
      return NextResponse.json({ error: 'Origem da requisição inválida.' }, { status: 403 });
    }
    const rateLimit = checkRateLimit(
      getRateLimitKey(request, 'password-reset'),
      10,
      15 * 60 * 1000
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente mais tarde.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
      );
    }
    const validationResult = passwordResetSchema.safeParse(await request.json());
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0]?.message || 'Dados inválidos.' },
        { status: 400 }
      );
    }

    const senhaHash = await bcrypt.hash(validationResult.data.password, 12);
    const passwordChanged = await resetPassword(validationResult.data.token, senhaHash);
    if (!passwordChanged) {
      return NextResponse.json(
        { error: 'Este link é inválido, já foi utilizado ou expirou.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[POST /api/auth/redefinir-senha]', error);
    return NextResponse.json({ error: 'Não foi possível redefinir a senha.' }, { status: 500 });
  }
}
