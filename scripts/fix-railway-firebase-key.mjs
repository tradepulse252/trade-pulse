#!/usr/bin/env node
/** Normalize and re-set FIREBASE_PRIVATE_KEY on linked Railway service. */
import { execSync, spawnSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const backend = join(dirname(fileURLToPath(import.meta.url)), '..', 'backend');
const vars = JSON.parse(execSync('railway variable list --json', { cwd: backend, encoding: 'utf8' }));

function normalizePrivateKey(raw) {
  return raw.trim().replace(/^["']+|["']+$/g, '').replace(/\\n/g, '\n');
}

const normalized = normalizePrivateKey(vars.FIREBASE_PRIVATE_KEY ?? '');
console.log('Updating FIREBASE_PRIVATE_KEY on Railway (normalized PEM)...');

const result = spawnSync('railway', ['variable', 'set', 'FIREBASE_PRIVATE_KEY', '--stdin'], {
  cwd: backend,
  input: normalized,
  encoding: 'utf8',
  shell: true,
});

if (result.status !== 0) {
  console.error(result.stderr || result.stdout);
  process.exit(result.status ?? 1);
}

console.log('Done. Redeploying...');
execSync('railway redeploy --yes', { cwd: backend, stdio: 'inherit', shell: true });
