type RateLimitEntry = {
  attempts: number;
  resetAt: number;
};

const attempts = new Map<string, RateLimitEntry>();
const MAX_TRACKED_KEYS = 10_000;

function removeExpiredEntries(now: number) {
  for (const [key, entry] of attempts) {
    if (entry.resetAt <= now) attempts.delete(key);
  }
}

export function checkRateLimit(key: string, limit = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  if (attempts.size >= MAX_TRACKED_KEYS) removeExpiredEntries(now);
  if (attempts.size >= MAX_TRACKED_KEYS && !attempts.has(key)) {
    return { allowed: false, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }
  const current = attempts.get(key);

  if (!current || current.resetAt <= now) {
    attempts.set(key, { attempts: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.attempts >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000) };
  }

  current.attempts += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function resetRateLimit(key: string) {
  attempts.delete(key);
}

export function getRateLimitKey(request: Pick<Request, 'headers'>, scope: string): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const clientIp =
    process.env.TRUST_PROXY === 'true' && forwardedFor
      ? forwardedFor.split(',')[0]?.trim() || 'unknown'
      : 'unknown';
  return `${scope}:${clientIp}`;
}
