import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/server/prisma';
import { generateJWT, setSessionCookie } from '@/lib/server/auth';
import { loginSchema } from '@/lib/validations/auth';
import { checkRateLimit, resetRateLimit } from '@/lib/server/rate-limit';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0]?.message || 'Dados inválidos.' },
        { status: 400 }
      );
    }

    const { username, password } = validationResult.data;
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateLimitKey = `${clientIp}:${username.trim().toLowerCase()}`;
    const rateLimit = checkRateLimit(rateLimitKey);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente mais tarde.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
      );
    }

    const user = await prisma.servidor.findFirst({
      where: {
        OR: [{ matricula: username }, { cpf: username }, { email: username }],
      },
    });

    if (!user || !user.senhaHash) {
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
