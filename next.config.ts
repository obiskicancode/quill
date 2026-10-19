import type { NextConfig } from 'next';

const config: NextConfig = {
  images: { formats: ['image/avif', 'image/webp'] },
  poweredByHeader: false,
  // argon2 ships a native binary; keep it out of the bundled server code.
  serverExternalPackages: ['argon2'],
  async headers() {
    return [
      {
        // The admin area must never be indexed and never served from cache.
        source: '/admin/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ];
  },
};

export default config;
