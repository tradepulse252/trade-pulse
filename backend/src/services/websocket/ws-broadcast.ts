import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import type { OpportunityResult, WsMessage } from '../../types';
import type { AggregatedMarket } from '../exchanges/types';

let wss: WebSocketServer | null = null;
const clients = new Set<WebSocket>();

interface PriceTick {
  baseAsset: string;
  symbol: string;
  price: number;
  priceChange24h: number;
}

const pendingTicks = new Map<string, PriceTick>();
let tickFlushTimer: NodeJS.Timeout | null = null;
const TICK_FLUSH_MS = 100;

export function initWebSocketServer(server: Server): void {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log(`[ws-broadcast] Client connected (${clients.size} total)`);

    ws.on('close', () => {
      clients.delete(ws);
      console.log(`[ws-broadcast] Client disconnected (${clients.size} total)`);
    });

    ws.on('error', () => clients.delete(ws));

    ws.send(JSON.stringify({ type: 'connected', timestamp: Date.now() }));
  });

  setInterval(() => {
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.ping();
      }
    }
  }, 30_000);
}

function broadcast(message: WsMessage | Record<string, unknown>): void {
  if (clients.size === 0) return;
  const payload = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

export function broadcastOpportunities(data: OpportunityResult[]): void {
  broadcast({ type: 'opportunity_update', data, timestamp: Date.now() });
}

export function broadcastMarkets(data: AggregatedMarket[]): void {
  broadcast({ type: 'markets_update', data, timestamp: Date.now() });
}

export function queuePriceTick(tick: PriceTick): void {
  pendingTicks.set(tick.baseAsset, tick);
  if (tickFlushTimer) return;
  tickFlushTimer = setTimeout(() => {
    const batch = Array.from(pendingTicks.values());
    pendingTicks.clear();
    tickFlushTimer = null;
    if (batch.length > 0) {
      broadcast({ type: 'price_tick', data: batch, timestamp: Date.now() });
    }
  }, TICK_FLUSH_MS);
}

export function getConnectedClients(): number {
  return clients.size;
}
