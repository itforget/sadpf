import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/server/prisma';
import { generateJWT, setSessionCookie } from '@/lib/server/auth';
import { isSameOriginMutation } from '@/lib/server/access';
import { loginSchema } from '@/lib/validations/auth';
import { checkRateLimit, getRateLimitKey, resetRateLimit } from '@/lib/server/rate-limit';
import { sendFirstAccessEmail } from '@/lib/server/password-reset';

export async function POST(req: Request) {
  try {
    if (!isSameOriginMutation(req)) {
      return NextResponse.json({ error: 'Origem da requisição inválida.' }, { status: 403 });
    }
    const body = await req.json();

    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0]?.message || 'Dados inválidos.' },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;
    const normalizedEmail = email.trim().toLowerCase();
    const rateLimitKey = `${getRateLimitKey(req, 'login')}:${normalizedEmail}`;
    const rateLimit = checkRateLimit(rateLimitKey);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente mais tarde.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
      );
    }

    const user = await prisma.servidor.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário ou senha inválidos.' }, { status: 401 });
    }

    if (user.status !== 'Ativo') {
      return NextResponse.json({ error: 'Usuário ou senha inválidos.' }, { status: 401 });
    }

    if (!['ADMIN', 'OPERADOR'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Apenas administradores e operadores podem acessar o sistema.' },
        { status: 403 }
      );
    }

    if (!user.senhaDefinidaEm) {
      await sendFirstAccessEmail(user);
      resetRateLimit(rateLimitKey);
      return NextResponse.json({
        ok: true,
        firstAccess: true,
        message: 'Enviamos um link para definir sua senha ao e-mail informado.',
      });
    }

    if (!user.senhaHash || !password) {
      return NextResponse.json({ ok: true, passwordRequired: true });
    }

    const valid = await bcrypt.compare(password, user.senhaHash);
    if (!valid) {
      return NextResponse.json({ error: 'Usuário ou senha inválidos.' }, { status: 401 });
    }

    resetRateLimit(rateLimitKey);

    const token = generateJWT({
      id: user.id,
      nome: user.nome,
      matricula: user.matricula,
      email: user.email,
      role: user.role,
      authVersion: user.updatedAt.getTime(),
    });

    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        nome: user.nome,
        matricula: user.matricula,
        email: user.email,
      },
    });

    return setSessionCookie(response, token);
  } catch (error: unknown) {
    console.error('[POST /api/auth/login]', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
