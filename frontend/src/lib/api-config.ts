/** Production Railway API — used when Vercel env vars are not set. */
export const PRODUCTION_API_URL =
  'https://tradepulse-production-a56b.up.railway.app';

export const PRODUCTION_WS_URL =
  'wss://tradepulse-production-a56b.up.railway.app';

export function getApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  }
  if (process.env.NODE_ENV === 'production') {
    return PRODUCTION_API_URL;
  }
  return 'http://localhost:4000';
}

export function getWsUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL.replace(/\/$/, '');
  }
  if (process.env.NODE_ENV === 'production') {
    return PRODUCTION_WS_URL;
  }
  return 'ws://localhost:4000';
}
