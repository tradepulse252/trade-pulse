import type { NextConfig } from 'next';

const PRODUCTION_API_URL = 'https://tradepulse-production-a56b.up.railway.app';
const PRODUCTION_WS_URL = 'wss://tradepulse-production-a56b.up.railway.app';

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL ??
      (process.env.NODE_ENV === 'production' ? PRODUCTION_API_URL : undefined),
    NEXT_PUBLIC_WS_URL:
      process.env.NEXT_PUBLIC_WS_URL ??
      (process.env.NODE_ENV === 'production' ? PRODUCTION_WS_URL : undefined),
  },
};

export default nextConfig;
