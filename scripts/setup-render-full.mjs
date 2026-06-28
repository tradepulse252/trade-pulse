#!/usr/bin/env node
/**
 * Deploy Trade-Pulse backend to Render via Blueprint API.
 *
 * Prerequisites:
 *   - RENDER_API_KEY in env (Render Dashboard → Account → API Keys)
 *   - Optional: backend/firebase-service-account.json for Firebase env vars
 *
 * Usage:
 *   set RENDER_API_KEY=rnd_...
 *   node scripts/setup-render-full.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const API_KEY = process.env.RENDER_API_KEY;
const REPO = process.env.RENDER_REPO ?? 'https://github.com/tradepulse252/trade-pulse';
const BRANCH = process.env.RENDER_BRANCH ?? 'main';
const FRONTEND_URL =
  process.env.FRONTEND_URL ?? 'https://tradepulse.vercel.app';
const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ?? 'muchocoffee-tradepulse252';

if (!API_KEY) {
  console.error('Missing RENDER_API_KEY. Create one at https://dashboard.render.com/u/settings#api-keys');
  process.exit(1);
}

async function api(method, urlPath, body) {
  const res = await fetch(`https://api.render.com/v1${urlPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`${method} ${urlPath} → ${res.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  }
  return data;
}

function loadFirebaseCreds() {
  const jsonPath = path.join(ROOT, 'backend', 'firebase-service-account.json');
  if (fs.existsSync(jsonPath)) {
    const sa = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    return {
      FIREBASE_PROJECT_ID: sa.project_id ?? FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL: sa.client_email,
      FIREBASE_PRIVATE_KEY: sa.private_key,
    };
  }
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return {
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ?? FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
    };
  }
  return null;
}

async function findServiceByName(name) {
  const list = await api('GET', '/services?limit=100');
  const items = Array.isArray(list) ? list : list?.items ?? [];
  for (const row of items) {
    const svc = row.service ?? row;
    if (svc?.name === name) return svc;
  }
  return null;
}

async function upsertEnvVar(serviceId, key, value) {
  if (!value) return;
  await api('PUT', `/services/${serviceId}/env-vars/${encodeURIComponent(key)}`, {
    envVar: { key, value: String(value) },
  });
}

async function main() {
  console.log('→ Checking existing Render services...');
  let service = await findServiceByName('tradepulse-api');

  if (!service) {
    console.log('→ Creating Blueprint from render.yaml...');
    try {
      const bp = await api('POST', '/blueprints', {
        name: 'tradepulse-stack',
        repo: REPO,
        branch: BRANCH,
        autoDeploy: 'yes',
      });
      console.log('  Blueprint created:', bp?.id ?? bp);
      console.log('  Wait for build in Render dashboard, then re-run this script to set Firebase env vars.');
    } catch (err) {
      console.warn('  Blueprint API:', err.message);
      console.log('  Create manually: Render → New → Blueprint → connect repo');
    }
    service = await findServiceByName('tradepulse-api');
  }

  if (!service) {
    console.log('\n⏳ Service not ready yet. After Render finishes building:');
    console.log('   1. Add FIREBASE_* env vars in dashboard (or re-run this script)');
    console.log('   2. Copy URL → update Vercel NEXT_PUBLIC_API_URL / NEXT_PUBLIC_WS_URL');
    return;
  }

  console.log('→ Found service:', service.name, service.id);
  const url = service.serviceDetails?.url ?? service.url;
  if (url) console.log('  URL:', url);

  const firebase = loadFirebaseCreds();
  if (firebase) {
    console.log('→ Setting Firebase env vars...');
    await upsertEnvVar(service.id, 'FIREBASE_PROJECT_ID', firebase.FIREBASE_PROJECT_ID);
    await upsertEnvVar(service.id, 'FIREBASE_CLIENT_EMAIL', firebase.FIREBASE_CLIENT_EMAIL);
    await upsertEnvVar(service.id, 'FIREBASE_PRIVATE_KEY', firebase.FIREBASE_PRIVATE_KEY);
    await upsertEnvVar(service.id, 'CORS_ORIGIN', FRONTEND_URL);
    await upsertEnvVar(service.id, 'FRONTEND_URL', FRONTEND_URL);
    await upsertEnvVar(service.id, 'EMAIL_USE_SMTP', 'false');
    await upsertEnvVar(service.id, 'PERSIST_MARKET_DATA', 'false');
    if (process.env.RESEND_API_KEY) {
      await upsertEnvVar(service.id, 'RESEND_API_KEY', process.env.RESEND_API_KEY);
    }
    console.log('  Env vars updated — trigger redeploy in Render dashboard.');
  } else {
    console.warn('\n⚠️  No Firebase credentials found.');
    console.warn('   Save service account JSON as backend/firebase-service-account.json');
    console.warn('   or set FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY in env, then re-run.');
  }

  if (url) {
    console.log('\n✅ Next — update Vercel:');
    console.log(`   NEXT_PUBLIC_API_URL=${url}`);
    console.log(`   NEXT_PUBLIC_WS_URL=${url.replace(/^http/, 'ws')}`);
  }
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
