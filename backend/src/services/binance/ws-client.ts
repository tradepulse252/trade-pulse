import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { env } from '../../config/env';
import { logError, logWarn } from '../../utils/logger';

export interface TickerStreamData {
  symbol: string;
  price: number;
  volume: number;
  quoteVolume: number;
  priceChangePercent: number;
  eventTime: number;
}

export interface MarkPriceStreamData {
  symbol: string;
  markPrice: number;
  indexPrice: number;
  fundingRate: number;
  nextFundingTime: number;
  eventTime: number;
}

type StreamCallback<T> = (data: T) => void;

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;
const PING_INTERVAL_MS = 3 * 60 * 1000;
const STALE_MESSAGE_MS = 45_000;
const STALE_CHECK_MS = 15_000;

export class BinanceWsClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private streams: Set<string> = new Set();
  private reconnectAttempts = 0;
  private pingTimer: NodeJS.Timeout | null = null;
  private staleTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private shouldReconnect = true;
  private lastMessageAt = Date.now();

  private tickerCallbacks: StreamCallback<TickerStreamData>[] = [];
  private markPriceCallbacks: StreamCallback<MarkPriceStreamData>[] = [];

  get isReceiving(): boolean {
    return this.lastMessageAt > 0 && Date.now() - this.lastMessageAt <= STALE_MESSAGE_MS;
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get lastMessageTimestamp(): number {
    return this.lastMessageAt;
  }

  noteActivity(): void {
    this.lastMessageAt = Date.now();
  }

  subscribeTicker(callback: StreamCallback<TickerStreamData>): void {
    this.tickerCallbacks.push(callback);
    this.addStream('!ticker@arr');
  }

  subscribeMarkPrice(callback: StreamCallback<MarkPriceStreamData>): void {
    this.markPriceCallbacks.push(callback);
    this.addStream('!markPrice@arr@1s');
  }

  subscribeSymbol(symbol: string): void {
    const lower = symbol.toLowerCase();
    this.addStream(`${lower}@ticker`);
    this.addStream(`${lower}@markPrice@1s`);
  }

  private addStream(stream: string): void {
    const isNew = !this.streams.has(stream);
    this.streams.add(stream);
    // Only reconnect when already live — never auto-connect mid-registration
    if (isNew && this.isConnected) {
      this.reconnect();
    }
  }

  connect(): void {
    if (this.isConnecting || this.streams.size === 0) return;
    this.isConnecting = true;

    const streamPath = Array.from(this.streams).map(encodeURIComponent).join('/');
    const url = `${env.BINANCE_WS_BASE}/stream?streams=${streamPath}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.lastMessageAt = Date.now();
        this.startPing();
        this.startStaleWatch();
        this.emit('connected');
        console.log('[binance-ws] Connected to stream');
      });

      this.ws.on('message', (raw) => {
        this.lastMessageAt = Date.now();
        try {
          const message = JSON.parse(raw.toString());
          this.handleMessage(message);
        } catch (error) {
          logWarn('binance-ws', 'Failed to parse message', { error: (error as Error).message });
        }
      });

      this.ws.on('close', () => {
        this.isConnecting = false;
        this.stopPing();
        this.stopStaleWatch();
        this.emit('disconnected');
        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      });

      this.ws.on('error', (error) => {
        this.isConnecting = false;
        logError('binance-ws', 'WebSocket error', {}, error.message);
      });

      this.ws.on('pong', () => {
        this.lastMessageAt = Date.now();
      });
    } catch (error) {
      this.isConnecting = false;
      logError('binance-ws', 'Connection failed', {}, (error as Error).stack);
      this.scheduleReconnect();
    }
  }

  private handleMessage(message: { stream?: string; data?: unknown }): void {
    if (!message.data) return;

    const data = message.data;

    // All-ticker array stream
    if (Array.isArray(data)) {
      for (const item of data) {
        if ('c' in item && 's' in item) {
          this.dispatchTicker(this.parseTicker(item as Record<string, string>));
        } else if ('p' in item && 'r' in item) {
          this.dispatchMarkPrice(this.parseMarkPrice(item as Record<string, string>));
        }
      }
      return;
    }

    const record = data as Record<string, string>;
    if ('c' in record) {
      this.dispatchTicker(this.parseTicker(record));
    } else if ('p' in record && 'r' in record) {
      this.dispatchMarkPrice(this.parseMarkPrice(record));
    }
  }

  private parseTicker(raw: Record<string, string>): TickerStreamData {
    return {
      symbol: raw.s,
      price: parseFloat(raw.c),
      volume: parseFloat(raw.v),
      quoteVolume: parseFloat(raw.q),
      priceChangePercent: parseFloat(raw.P),
      eventTime: parseInt(raw.E, 10),
    };
  }

  private parseMarkPrice(raw: Record<string, string>): MarkPriceStreamData {
    return {
      symbol: raw.s,
      markPrice: parseFloat(raw.p),
      indexPrice: parseFloat(raw.i),
      fundingRate: parseFloat(raw.r),
      nextFundingTime: parseInt(raw.T, 10),
      eventTime: parseInt(raw.E, 10),
    };
  }

  private dispatchTicker(data: TickerStreamData): void {
    for (const cb of this.tickerCallbacks) cb(data);
    this.emit('ticker', data);
  }

  private dispatchMarkPrice(data: MarkPriceStreamData): void {
    for (const cb of this.markPriceCallbacks) cb(data);
    this.emit('markPrice', data);
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, PING_INTERVAL_MS);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private startStaleWatch(): void {
    this.stopStaleWatch();
    this.staleTimer = setInterval(() => {
      if (this.streams.size === 0) return;

      const stale = Date.now() - this.lastMessageAt > STALE_MESSAGE_MS;
      if (stale) {
        logWarn('binance-ws', 'Stream stale — forcing reconnect');
        this.reconnect();
        return;
      }

      if (!this.isConnected && !this.isConnecting && this.shouldReconnect) {
        this.connect();
      }
    }, STALE_CHECK_MS);
  }

  private stopStaleWatch(): void {
    if (this.staleTimer) {
      clearInterval(this.staleTimer);
      this.staleTimer = null;
    }
  }

  private scheduleReconnect(): void {
    const delay = Math.min(
      RECONNECT_BASE_MS * Math.pow(2, this.reconnectAttempts),
      RECONNECT_MAX_MS
    );
    this.reconnectAttempts++;
    logWarn('binance-ws', `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => this.reconnect(), delay);
  }

  reconnect(): void {
    this.disconnect(false);
    this.connect();
  }

  disconnect(permanent = true): void {
    this.shouldReconnect = !permanent;
    this.stopPing();
    this.stopStaleWatch();
    if (this.ws) {
      this.ws.removeAllListeners();
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      }
      this.ws = null;
    }
  }
}

export const binanceWs = new BinanceWsClient();
