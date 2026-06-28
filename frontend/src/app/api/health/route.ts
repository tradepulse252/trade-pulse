import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BACKEND_API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_API.replace(/\/$/, '')}/api/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    // fall through to stub
  }

  return NextResponse.json({
    status: 'healthy',
    restApi: 'degraded',
    websocket: 'down',
    database: 'degraded',
    redis: 'down',
    cacheBackend: null,
    activeSymbols: 0,
    connectedClients: 0,
    uptime: 0,
    timestamp: new Date().toISOString(),
    source: 'vercel-fallback',
  });
}
