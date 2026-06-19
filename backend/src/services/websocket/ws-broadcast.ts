import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import type { OpportunityResult, WsMessage } from '../../types';

let wss: WebSocketServer | null = null;
const clients = new Set<WebSocket>();

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

  // Heartbeat every 30s
  setInterval(() => {
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.ping();
      }
    }
  }, 30_000);
}

function broadcast(message: WsMessage): void {
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

export function getConnectedClients(): number {
  return clients.size;
}
