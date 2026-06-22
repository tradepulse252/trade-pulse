import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
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
