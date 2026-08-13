type RateLimitEntry = {
  attempts: number;
  resetAt: number;
};

const attempts = new Map<string, RateLimitEntry>();

export function checkRateLimit(key: string, limit = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
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
