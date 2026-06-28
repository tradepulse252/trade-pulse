#!/usr/bin/env node
/**
 * Trade-Pulse — full Northflank setup (steps 2–5)
 * Requires: NORTHFLANK_API_KEY, GitHub linked on Northflank, Firebase service account
 *
 * Usage:
 *   set NORTHFLANK_API_KEY=your-token
 *   node scripts/setup-northflank-full.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawnSync } from 'child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://api.northflank.com/v1';
const TOKEN = process.env.NORTHFLANK_API_KEY || process.env.NORTHFLANK_API_TOKEN;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://frontend-omega-two-31.vercel.app';
const GITHUB_REPO = process.env.GITHUB_REPO || 'https://github.com/tradepulse252/trade-pulse';
const PROJECT_NAME = process.env.NORTHFLANK_PROJECT_NAME || 'tradepulse';
const SERVICE_NAME = process.env.NORTHFLANK_SERVICE_NAME || 'tradepulse-api';

function log(msg) {
  console.log(`[northflank] ${msg}`);
}

function fail(msg) {
  console.error(`[northflank] ERROR: ${msg}`);
  process.exit(1);
}

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

function loadFirebaseCredentials() {
  const jsonPath = join(ROOT, 'backend/firebase-service-account.json');
  if (existsSync(jsonPath)) {
    const j = JSON.parse(readFileSync(jsonPath, 'utf8'));
    return {
      FIREBASE_PROJECT_ID: j.project_id,
      FIREBASE_CLIENT_EMAIL: j.client_email,
      FIREBASE_PRIVATE_KEY: j.private_key,
    };
  }
  const env = loadEnvFile(join(ROOT, 'backend/.env'));
  return {
    FIREBASE_PROJECT_ID: env.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'muchocoffee-tradepulse252',
    FIREBASE_CLIENT_EMAIL: env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY,
  };
}

async function nf(path, method = 'GET', body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(json).slice(0, 500)}`);
  }
  return json;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function buildRuntimeEnv(localEnv, firebase) {
  const jwt =
    localEnv.JWT_SECRET ||
    process.env.JWT_SECRET ||
    fail('JWT_SECRET missing — set in backend/.env');

  if (!firebase.FIREBASE_CLIENT_EMAIL || !firebase.FIREBASE_PRIVATE_KEY) {
    fail(
      'Firebase credentials missing. Download service account JSON from Firebase Console →\n' +
        '  Project Settings → Service Accounts → Generate key\n' +
        '  Save as backend/firebase-service-account.json (gitignored)\n' +
        '  Or set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in backend/.env'
    );
  }

  return {
    NODE_ENV: 'production',
    PORT: '4000',
    FIREBASE_PROJECT_ID: firebase.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: firebase.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: firebase.FIREBASE_PRIVATE_KEY,
    FIRESTORE_DATABASE_ID: '(default)',
    JWT_SECRET: jwt,
    CORS_ORIGIN: FRONTEND_URL,
    FRONTEND_URL,
    EMAIL_USE_SMTP: 'false',
    PERSIST_MARKET_DATA: 'false',
    AGGREGATION_REFRESH_MS: '90000',
    BINANCE_REST_FALLBACK_MS: '120000',
    BINANCE_ENABLE_OI_BATCH: 'false',
    BINANCE_REST_BASE: 'https://fapi.binance.com',
    BINANCE_WS_BASE: 'wss://fstream.binance.com',
    MIN_VOLUME_USDT: '1000000',
    MIN_OPEN_INTEREST_USDT: '500000',
    SCORING_INTERVAL_MS: '10000',
    OI_REFRESH_INTERVAL_MS: '300000',
    RESEND_API_KEY: localEnv.RESEND_API_KEY || process.env.RESEND_API_KEY || '',
    RESEND_FROM_ADDRESS: localEnv.RESEND_FROM_ADDRESS || process.env.RESEND_FROM_ADDRESS || '',
    BINANCE_API_KEY: localEnv.BINANCE_API_KEY || '',
    BINANCE_API_SECRET: localEnv.BINANCE_API_SECRET || '',
    REDIS_URL: localEnv.REDIS_URL || process.env.REDIS_URL || '',
  };
}

async function getOrCreateProject() {
  if (process.env.NORTHFLANK_PROJECT_ID) {
    return process.env.NORTHFLANK_PROJECT_ID;
  }
  const list = await nf('/projects');
  const projects = list.data?.projects || list.data || [];
  const existing = projects.find((p) => p.id === PROJECT_NAME || p.name === PROJECT_NAME);
  if (existing) {
    log(`Using project: ${existing.id}`);
    return existing.id;
  }
  const created = await nf('/projects', 'POST', {
    name: PROJECT_NAME,
    description: 'Trade-Pulse API',
    region: 'europe-west',
    color: '#A78BFA',
  });
  const id = created.data?.id || created.data?.project?.id;
  if (!id) fail('Could not create project — check API token permissions');
  log(`Created project: ${id}`);
  return id;
}

function combinedServicePayload(runtimeEnvironment) {
  return {
    name: SERVICE_NAME,
    description: 'Trade-Pulse Express API + WebSocket',
    billing: {
      deploymentPlan: 'nf-compute-20',
      buildPlan: 'nf-compute-400-16',
    },
    buildSource: 'git',
    vcsData: {
      projectUrl: GITHUB_REPO,
      projectType: 'github',
      projectBranch: 'main',
    },
    buildSettings: {
      dockerfile: {
        buildEngine: 'kaniko',
        useCache: true,
        dockerFilePath: '/backend/Dockerfile',
        dockerWorkDir: '/backend',
      },
    },
    deployment: {
      instances: 1,
      docker: { configType: 'default' },
      storage: { ephemeralStorage: { storageSize: 1024 } },
    },
    ports: [
      {
        name: 'http',
        internalPort: 4000,
        public: true,
        protocol: 'HTTP',
        security: { credentials: [], policies: [] },
      },
    ],
    healthChecks: [
      {
        protocol: 'HTTP',
        type: 'readinessProbe',
        path: '/api/health',
        port: 4000,
        initialDelaySeconds: 20,
        periodSeconds: 30,
        timeoutSeconds: 10,
        failureThreshold: 5,
      },
    ],
    runtimeEnvironment,
    autoscaling: {},
  };
}

async function getOrCreateService(projectId, runtimeEnvironment) {
  const list = await nf(`/projects/${projectId}/services`);
  const services = list.data?.services || list.data || [];
  const existing = services.find((s) => s.id === SERVICE_NAME || s.name === SERVICE_NAME);

  if (existing) {
    log(`Updating service: ${existing.id}`);
    await nf(`/projects/${projectId}/services/combined/${existing.id}`, 'PATCH', {
      runtimeEnvironment,
      vcsData: {
        projectUrl: GITHUB_REPO,
        projectType: 'github',
        projectBranch: 'main',
      },
    });
    return existing.id;
  }

  log('Creating combined service...');
  const created = await nf(`/projects/${projectId}/services/combined`, 'POST', combinedServicePayload(runtimeEnvironment));
  const id = created.data?.id || created.data?.service?.id;
  if (!id) fail('Could not create combined service — ensure GitHub is linked on Northflank');
  log(`Created service: ${id}`);
  return id;
}

async function triggerBuild(projectId, serviceId) {
  log('Starting build from main branch...');
  await nf(`/projects/${projectId}/services/${serviceId}/build`, 'POST', { branch: 'main' });
}

async function waitForService(projectId, serviceId, timeoutMs = 900000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await nf(`/projects/${projectId}/services/${serviceId}`);
    const svc = res.data?.service || res.data;
    const status = svc?.deploymentStatus?.status || svc?.status;
    const ready = svc?.deploymentStatus?.readyReplicas ?? svc?.readyReplicas;
    log(`Status: ${status || 'unknown'} ready=${ready ?? '?'}`);
    if (status === 'completed' || status === 'running' || ready >= 1) {
      return svc;
    }
    if (status === 'failed' || status === 'error') {
      fail(`Deployment failed: ${JSON.stringify(svc?.deploymentStatus || svc).slice(0, 400)}`);
    }
    await sleep(15000);
  }
  fail('Timed out waiting for deployment');
}

function resolvePublicUrl(projectId, serviceId, svc) {
  const port = svc?.ports?.find((p) => p.public && p.internalPort === 4000) || svc?.ports?.[0];
  if (port?.domains?.length) {
    return `https://${port.domains[0]}`;
  }
  return `https://${serviceId}--${projectId}.code.run`;
}

async function verifyHealth(apiUrl) {
  const url = `${apiUrl.replace(/\/$/, '')}/api/health`;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (res.ok) {
        const json = await res.json();
        log(`Health OK: ${json.status}`);
        return;
      }
    } catch {
      // retry
    }
    log(`Waiting for health (${i + 1}/20)...`);
    await sleep(10000);
  }
  fail(`Health check failed: ${url}`);
}

function setVercelEnv(name, value) {
  const frontendDir = join(ROOT, 'frontend');
  log(`Setting Vercel ${name}...`);
  const result = spawnSync('npx', ['vercel', 'env', 'add', name, 'production', '--force'], {
    cwd: frontendDir,
    input: value,
    encoding: 'utf8',
    shell: true,
  });
  if (result.status !== 0) {
    log(`Vercel env warning for ${name}: ${result.stderr || result.stdout}`);
  }
}

function deployVercel() {
  log('Deploying Vercel production...');
  execSync('npx vercel --prod --yes', { cwd: join(ROOT, 'frontend'), stdio: 'inherit' });
}

async function main() {
  if (!TOKEN) {
    fail(
      'NORTHFLANK_API_KEY not set.\n' +
        '  1. Sign up at https://northflank.com\n' +
        '  2. Account Settings → API → Create token\n' +
        '  3. Run: set NORTHFLANK_API_KEY=your-token (PowerShell: $env:NORTHFLANK_API_KEY="...")\n' +
        '  4. Re-run: node scripts/setup-northflank-full.mjs'
    );
  }

  const localEnv = loadEnvFile(join(ROOT, 'backend/.env'));
  const firebase = loadFirebaseCredentials();
  const runtimeEnvironment = buildRuntimeEnv(localEnv, firebase);

  log('Step 2–3: Create/update Northflank project + service with secrets');
  const projectId = await getOrCreateProject();
  const serviceId = await getOrCreateService(projectId, runtimeEnvironment);

  log('Step 4: Build and deploy');
  await triggerBuild(projectId, serviceId);
  const svc = await waitForService(projectId, serviceId);
  const apiUrl = resolvePublicUrl(projectId, serviceId, svc);
  log(`API URL: ${apiUrl}`);

  await verifyHealth(apiUrl);

  log('Step 5: Update Vercel env + redeploy');
  setVercelEnv('NEXT_PUBLIC_API_URL', apiUrl);
  setVercelEnv('NEXT_PUBLIC_WS_URL', apiUrl.replace(/^https:/, 'wss:'));
  deployVercel();

  log('Done!');
  log(`Backend:  ${apiUrl}`);
  log(`Frontend: ${FRONTEND_URL}`);
  log(`Health:   ${apiUrl}/api/health`);
  log(`Journal:  ${FRONTEND_URL}/journal`);
}

main().catch((err) => fail(err.message));
