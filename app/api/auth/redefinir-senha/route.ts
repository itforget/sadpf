import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { passwordResetSchema } from '@/lib/validations/auth';
import { resetPassword } from '@/lib/server/password-reset';

export async function POST(request: Request) {
  try {
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
