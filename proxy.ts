import { NextResponse, type NextRequest } from 'next/server';
import { getSessionToken, getSessionFromToken } from '@/lib/server/auth';

const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/redefinir-senha',
  '/redefinir-senha',
  '/api/auth/session',
  '/api/health',
  '/health',
  '/privacidade',
  '/assinar',
  '/autenticidade',
  '/favicon.ico',
  '/robots.txt',
];

const STATIC_PATHS = ['/_next', '/static', '/public'];

const ADMIN_ONLY_PATHS = ['/logs', '/usuarios', '/configuracoes'];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (STATIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith('/assinar/') ||
    pathname.startsWith('/autenticidade/') ||
    pathname.startsWith('/api/assinaturas/')
  ) {
    if (pathname === '/login') {
      const token = await getSessionToken(request);
      if (getSessionFromToken(token)) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
    return NextResponse.next();
  }

  const token = await getSessionToken(request);
  const session = getSessionFromToken(token);
  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  if (session.role === 'OPERADOR') {
    const isAdminRoute = ADMIN_ONLY_PATHS.some(
      (path) => pathname === path || pathname.startsWith(path + '/')
    );
    if (isAdminRoute) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
};
