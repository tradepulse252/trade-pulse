'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth, authHeaders } from '@/hooks/useAuth';
import { getSignalLabel, getSignalClass } from '@/lib/utils';
import { Star, Trash2 } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface WatchlistItem {
  id: string;
  symbol: string;
  notes: string | null;
  signal: { signalType: string; opportunityScore: number; rank: number | null } | null;
  addedAt: string;
}

export default function WatchlistPage() {
  const { user, token, loading: authLoading } = useAuth();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWatchlist = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/watchlist`, { headers: authHeaders(token) });
      if (res.ok) {
        const data = await res.json();
        setItems(data.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchWatchlist();
    else setLoading(false);
  }, [token]);

  const remove = async (symbol: string) => {
    await fetch(`${API_URL}/api/watchlist/${symbol}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    });
    setItems((prev) => prev.filter((i) => i.symbol !== symbol));
  };

  if (authLoading) return null;

  if (!user) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Sign in to manage your watchlist</p>
          <Link href="/login"><Button>Sign In</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-6 space-y-6">
        <h1 className="text-2xl font-bold">Watchlist</h1>
        {loading ? (
          <p className="text-muted-foreground animate-pulse">Loading...</p>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No symbols in your watchlist yet. Add favorites from the dashboard.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <Card key={item.id}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Link href={`/coin/${item.symbol}`} className="font-semibold hover:text-primary">
                      {item.symbol}
                    </Link>
                    {item.signal && (
                      <>
                        <span className={`text-xs ${getSignalClass(item.signal.signalType)}`}>
                          {getSignalLabel(item.signal.signalType)}
                        </span>
                        <span className="text-xs font-mono text-primary">
                          {item.signal.opportunityScore.toFixed(1)}
                        </span>
                      </>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => remove(item.symbol)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
