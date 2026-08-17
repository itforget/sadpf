import type { NextConfig } from 'next';

const scriptSrc = `script-src 'self' 'unsafe-inline'${
  process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''
};`;

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse', 'pdfkit'],
  experimental: {
    proxyClientMaxBodySize: '100mb',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' https://images.unsplash.com https://avatars.githubusercontent.com data:; style-src 'self' 'unsafe-inline'; " +
              scriptSrc +
              " font-src 'self' data:; connect-src 'self'",
          },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          ...(process.env.NODE_ENV === 'production'
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
