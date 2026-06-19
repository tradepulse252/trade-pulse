import type { TimeframeKey } from '../../config/env';

type MetricKey = 'price' | 'oi' | 'volume';

interface DataPoint {
  value: number;
  timestamp: Date;
}

const MAX_POINTS = 500;

class InMemoryStore {
  private data = new Map<string, Map<MetricKey, DataPoint[]>>();

  private getBuffer(symbol: string, metric: MetricKey): DataPoint[] {
    if (!this.data.has(symbol)) {
      this.data.set(symbol, new Map());
    }
    const symMap = this.data.get(symbol)!;
    if (!symMap.has(metric)) {
      symMap.set(metric, []);
    }
    return symMap.get(metric)!;
  }

  push(symbol: string, metric: MetricKey, value: number, timestamp = new Date()): void {
    const buffer = this.getBuffer(symbol, metric);
    buffer.push({ value, timestamp });
    if (buffer.length > MAX_POINTS) {
      buffer.splice(0, buffer.length - MAX_POINTS);
    }
  }

  getHistory(symbol: string, metric: MetricKey): DataPoint[] {
    return [...this.getBuffer(symbol, metric)];
  }

  has(symbol: string): boolean {
    return this.data.has(symbol);
  }
}

export const memoryStore = new InMemoryStore();

export function seedFromTicker(
  symbol: string,
  price: number,
  volumeUsdt: number,
  priceChange24h: number
): void {
  const now = new Date();
  memoryStore.push(symbol, 'price', price, now);
  memoryStore.push(symbol, 'volume', volumeUsdt, now);

  // Seed approximate 24h-ago baseline for growth calculations on cold start
  if (priceChange24h !== 0) {
    const prevPrice = price / (1 + priceChange24h / 100);
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    memoryStore.push(symbol, 'price', prevPrice, hourAgo);
  }
}
