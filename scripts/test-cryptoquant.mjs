#!/usr/bin/env node
/**
 * Test CryptoQuant API connectivity and all 6 metric endpoints.
 * Usage: CRYPTOQUANT_API_KEY=your_key node scripts/test-cryptoquant.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadEnvFile() {
  const envPath = join(root, 'backend', '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

loadEnvFile();

const KEY = process.env.CRYPTOQUANT_API_KEY?.trim();
const BASE = 'https://api.cryptoquant.com/v1';

async function cqFetch(path, params) {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${KEY}` },
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, status: res.status, error: text.slice(0, 200) };
  }
  const code = json?.status?.code;
  const rows = json?.result?.data?.length ?? 0;
  const latest = json?.result?.data?.[rows - 1];
  return {
    ok: res.ok && code === 200 && rows > 0,
    status: res.status,
    code,
    rows,
    message: json?.status?.message,
    sample: latest ? Object.keys(latest).slice(0, 5).join(', ') : 'no data',
    latest,
  };
}

const tests = [
  { name: 'Stablecoin inflow (USDT)', path: '/stablecoin/exchange-flows/inflow', params: { token: 'usdt', exchange: 'all_exchange', window: 'day', limit: '1' } },
  { name: 'BTC inflow', path: '/btc/exchange-flows/inflow', params: { exchange: 'all_exchange', window: 'day', limit: '1' } },
  { name: 'BTC outflow', path: '/btc/exchange-flows/outflow', params: { exchange: 'all_exchange', window: 'day', limit: '1' } },
  { name: 'BTC netflow', path: '/btc/exchange-flows/netflow', params: { exchange: 'all_exchange', window: 'day', limit: '1' } },
  { name: 'BTC exchange reserve', path: '/btc/exchange-flows/reserve', params: { exchange: 'all_exchange', window: 'day', limit: '1' } },
  { name: 'BTC whale ratio', path: '/btc/flow-indicator/exchange-whale-ratio', params: { exchange: 'binance', window: 'day', limit: '1' } },
];

console.log('\n=== CryptoQuant API Test ===\n');

if (!KEY) {
  console.log('FAIL: CRYPTOQUANT_API_KEY is not set.');
  console.log('Add it to backend/.env or Railway → Variables, then redeploy.\n');
  process.exit(1);
}

console.log(`Key: set (${KEY.length} chars)\n`);

let passed = 0;
for (const t of tests) {
  const r = await cqFetch(t.path, t.params);
  const icon = r.ok ? 'OK' : 'FAIL';
  if (r.ok) passed++;
  console.log(`[${icon}] ${t.name}`);
  if (!r.ok) console.log(`      HTTP ${r.status} code=${r.code} msg=${r.message ?? r.error}`);
  else console.log(`      rows=${r.rows} fields: ${r.sample}`);
}

console.log(`\nResult: ${passed}/${tests.length} endpoints OK\n`);

if (passed === tests.length) {
  console.log('CryptoQuant integration should work once the key is on Railway and backend is redeployed.\n');
  process.exit(0);
}

console.log('Some endpoints failed — check API plan, key permissions, or endpoint paths.\n');
process.exit(1);
