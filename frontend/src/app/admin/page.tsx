'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getHealth } from '@/lib/api';
import { Activity, Database, Server, Wifi, Users, AlertTriangle } from 'lucide-react';

interface HealthData {
  status: string;
  restApi: string;
  websocket: string;
  database: string;
  redis: string;
  activeSymbols: number;
  connectedClients: number;
  uptime: number;
  timestamp: string;
}

export default function AdminPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getHealth();
        setHealth(data);
      } catch {
        // error
      } finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const statusColor = (status: string) => {
    if (status === 'healthy') return 'text-long';
    if (status === 'degraded') return 'text-yellow-400';
    return 'text-short';
  };

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">System health and monitoring</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground animate-pulse">Loading system status...</div>
        ) : !health ? (
          <div className="text-center py-12 text-short">Unable to connect to backend</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4 flex items-center gap-3">
                  <Server className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Overall Status</p>
                    <p className={`font-semibold capitalize ${statusColor(health.status)}`}>{health.status}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 flex items-center gap-3">
                  <Activity className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Active Symbols</p>
                    <p className="font-semibold font-mono">{health.activeSymbols}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">WS Clients</p>
                    <p className="font-semibold font-mono">{health.connectedClients}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Uptime</p>
                    <p className="font-semibold font-mono">{formatUptime(health.uptime)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Service Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'Binance REST API', status: health.restApi, icon: Server },
                    { label: 'Binance WebSocket', status: health.websocket, icon: Wifi },
                    { label: 'PostgreSQL Database', status: health.database, icon: Database },
                    { label: 'Redis Cache', status: health.redis, icon: Activity },
                  ].map((svc) => (
                    <div key={svc.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <svc.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{svc.label}</span>
                      </div>
                      <Badge variant={svc.status === 'healthy' ? 'long' : svc.status === 'degraded' ? 'neutral' : 'short'}>
                        {svc.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground text-center">
              Last updated: {new Date(health.timestamp).toLocaleString()}
            </p>
          </>
        )}
      </main>
    </div>
  );
}
