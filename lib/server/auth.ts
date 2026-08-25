import { createHmac, timingSafeEqual, randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'sadpf_session';
const SECRET = process.env.SADPF_SECRET || process.env.NEXTAUTH_SECRET || '';

function base64UrlEncode(value: Buffer | string): string {
  const buffer = typeof value === 'string' ? Buffer.from(value, 'utf-8') : value;
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value: string): Buffer {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, 'base64');
}

export async function getSessionToken(req?: NextRequest): Promise<string | null> {
  if (req) {
    return req.cookies.get(SESSION_COOKIE)?.value ?? null;
  }
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

function signJWT(data: string): string {
  return base64UrlEncode(createHmac('sha256', SECRET).update(data).digest());
}

export function generateJWT(
  payload: Record<string, unknown>,
  expiresInSeconds = 60 * 60 * 8
): string {
  if (SECRET.length < 32) {
    throw new Error(
      'SADPF_SECRET (ou NEXTAUTH_SECRET) deve ter ao menos 32 caracteres para emitir JWTs.'
    );
  }

  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
    jti: randomBytes(8).toString('hex'),
  };
  const payloadPart = base64UrlEncode(JSON.stringify(tokenPayload));
  const data = `${header}.${payloadPart}`;
  return `${data}.${signJWT(data)}`;
}

export function decodeJWT(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(parts[1]).toString('utf-8'));
    return payload;
  } catch {
    return null;
  }
}

function verifyJWT(token: string, secret: string): boolean {
  if (!secret) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [header, payload, signature] = parts;
  const data = `${header}.${payload}`;
  let signatureBuffer: Buffer;

  try {
    signatureBuffer = base64UrlDecode(signature);
  } catch {
    return false;
  }

  const expectedSignature = createHmac('sha256', secret).update(data).digest();
  if (signatureBuffer.length !== expectedSignature.length) return false;
  if (!timingSafeEqual(expectedSignature, signatureBuffer)) return false;

  const decoded = decodeJWT(token);
  if (!decoded || typeof decoded !== 'object') return false;
  const exp = typeof decoded.exp === 'number' ? decoded.exp : Number(decoded.exp);
  return !Number.isNaN(exp) && exp > Math.floor(Date.now() / 1000);
}

export function isAuthenticated(token: string | null): boolean {
  if (!token) return false;
  return SECRET.length >= 32 ? verifyJWT(token, SECRET) : false;
}

export function getSessionFromToken(token: string | null) {
  if (!token || !isAuthenticated(token)) return null;
  const decoded = decodeJWT(token);
  if (!decoded || !['ADMIN', 'OPERADOR'].includes(decoded.role as string)) return null;
  return decoded;
}

export async function requireAuth(req: NextRequest): Promise<NextResponse | null> {
  const token = await getSessionToken(req);
  if (!getSessionFromToken(token)) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  return null;
}

export function setSessionCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
  return response;
}

export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  return response;
}
