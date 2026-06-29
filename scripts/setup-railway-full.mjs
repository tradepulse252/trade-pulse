#!/usr/bin/env node
/**
 * Print Railway deploy checklist and optional CLI hints.
 * Full deploy requires Railway dashboard or `railway` CLI login.
 *
 * Usage:
 *   node scripts/setup-railway-full.mjs
 *   RAILWAY_SERVICE_URL=https://xxx.up.railway.app node scripts/setup-railway-full.mjs
 */

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'https://tradepulses.vercel.app';
const RAILWAY_URL = process.env.RAILWAY_SERVICE_URL ?? process.env.RAILWAY_PUBLIC_DOMAIN ?? '';

console.log(`
=== Trade-Pulse → Railway ===

1. https://railway.app/new → Deploy from GitHub → trade-pulse
2. Service Settings:
   - Root Directory: backend
   - Config file: /backend/railway.toml
3. Networking → Generate Domain
4. Variables (see RAILWAY-SETUP.md):
   - JWT_SECRET, FIREBASE_*, CORS_ORIGIN=${FRONTEND_URL}
5. Vercel (tradepulses project):
   - NEXT_PUBLIC_API_URL=https://YOUR.up.railway.app
   - NEXT_PUBLIC_WS_URL=wss://YOUR.up.railway.app

Guide: RAILWAY-SETUP.md
`);

if (RAILWAY_URL) {
  const base = RAILWAY_URL.replace(/\/$/, '');
  const ws = base.replace(/^http/, 'ws');
  console.log('Suggested Vercel env:');
  console.log(`  NEXT_PUBLIC_API_URL=${base}`);
  console.log(`  NEXT_PUBLIC_WS_URL=${ws}`);
}
