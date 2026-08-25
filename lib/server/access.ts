import 'server-only';

import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { getSessionFromToken, getSessionToken } from '@/lib/server/auth';

export type VerifiedSession = {
  id: string;
  nome: string;
  matricula: string;
  email: string;
  role: 'ADMIN' | 'OPERADOR';
};

/**
 * Confirma a sessão junto à fonte de dados. O proxy continua sendo apenas uma
 * verificação otimista; handlers devem usar esta função antes de ler ou mudar
 * dados protegidos.
 */
export async function getVerifiedSession(request?: NextRequest): Promise<VerifiedSession | null> {
  const token = getSessionFromToken(await getSessionToken(request));
  if (!token || typeof token.id !== 'string' || typeof token.authVersion !== 'number') return null;

  const user = await prisma.servidor.findUnique({
    where: { id: token.id },
    select: {
      id: true,
      nome: true,
      matricula: true,
      email: true,
      role: true,
      status: true,
      updatedAt: true,
    },
  });

  if (
    !user ||
    user.status !== 'Ativo' ||
    !['ADMIN', 'OPERADOR'].includes(user.role) ||
    user.updatedAt.getTime() !== token.authVersion
  ) {
    return null;
  }

  return {
    id: user.id,
    nome: user.nome,
    matricula: user.matricula,
    email: user.email,
    role: user.role as VerifiedSession['role'],
  };
}

export function isSameOriginMutation(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
