const IP_HEADER_CANDIDATES = [
  'x-forwarded-for',
  'x-real-ip',
  'cf-connecting-ip',
  'true-client-ip',
  'x-client-ip',
  'x-cluster-client-ip',
] as const;

export function getRequestIp(request: Pick<Request, 'headers'>): string {
  if (process.env.TRUST_PROXY !== 'true') return 'N/A';

  for (const headerName of IP_HEADER_CANDIDATES) {
    const value = request.headers.get(headerName);
    if (!value) continue;

    const ip = headerName === 'x-forwarded-for' ? value.split(',')[0]?.trim() : value.trim();
    if (ip) return ip;
  }

  return 'N/A';
}
