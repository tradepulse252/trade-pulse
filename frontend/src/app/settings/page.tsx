'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface BinanceStatus {
  configured: boolean;
  apiKeySet: boolean;
  restApi: string;
  websocket: string;
  lastWsMessage: string | null;
  trackedSymbols: number;
  liveOpportunities: number;
  mode: string;
}

export default function SettingsPage() {
  const [status, setStatus] = useState<BinanceStatus | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/settings/binance`);
      if (res.ok) setStatus(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const testConnection = async () => {
    setTestResult('Testing...');
    const res = await fetch(`${API_URL}/api/settings/binance/test`, { method: 'POST' });
    const data = await res.json();
    setTestResult(data.success ? `✅ ${data.message}` : `❌ ${data.message}`);
  };

  const statusIcon = (s: string) => {
    if (s === 'connected' || s === 'rest-fallback') return <CheckCircle className="h-4 w-4 text-long" />;
    return <XCircle className="h-4 w-4 text-short" />;
  };

  return (
    <div className="min-h-screen">
      <Header connected={status?.websocket === 'connected' || status?.websocket === 'rest-fallback'} />
      <main className="container mx-auto px-4 py-6 space-y-6 max-w-2xl">
        <h1 className="text-2xl font-bold">Binance API Settings</h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Connection Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-muted-foreground animate-pulse">Checking...</p>
            ) : !status ? (
              <p className="text-short">Backend not reachable. Start it with: <code className="text-xs">cd backend && npm run dev</code></p>
            ) : (
              <>
                <div className="grid gap-3">
                  {[
                    { label: 'REST API', value: status.restApi },
                    { label: 'WebSocket Stream', value: status.websocket },
                    { label: 'Data Mode', value: status.mode },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <span className="text-sm">{row.label}</span>
                      <div className="flex items-center gap-2">
                        {row.label.includes('API') || row.label.includes('WebSocket')
                          ? statusIcon(row.value)
                          : null}
                        <Badge variant="neutral">{row.value}</Badge>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="text-sm">API Key Configured</span>
                    <Badge variant={status.apiKeySet ? 'long' : 'neutral'}>
                      {status.apiKeySet ? 'Yes' : 'No (public endpoints)'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="text-sm">Tracked Symbols</span>
                    <span className="font-mono font-semibold">{status.trackedSymbols}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="text-sm">Live Opportunities</span>
                    <span className="font-mono font-semibold text-primary">{status.liveOpportunities}</span>
                  </div>
                </div>

                <Button onClick={testConnection} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" /> Test Binance Connection
                </Button>
                {testResult && <p className="text-sm text-center">{testResult}</p>}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">How to Connect Your Binance API Keys</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>Market data works without API keys. To use your own keys (higher rate limits):</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to <a href="https://www.binance.com/en/my/settings/api-management" target="_blank" rel="noopener" className="text-primary hover:underline">Binance API Management</a></li>
              <li>Create an API key with <strong>Read Only</strong> permissions (no trading needed)</li>
              <li>Open <code className="text-xs bg-muted px-1 rounded">backend/.env</code> and set:
                <pre className="mt-2 p-3 bg-muted/50 rounded text-xs overflow-x-auto">{`BINANCE_API_KEY=your_api_key_here\nBINANCE_API_SECRET=your_api_secret_here`}</pre>
              </li>
              <li>Restart the backend: <code className="text-xs bg-muted px-1 rounded">npm run dev</code></li>
            </ol>
            <p className="text-xs">Only Read permissions are required. Never enable withdrawals or trading for this app.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
