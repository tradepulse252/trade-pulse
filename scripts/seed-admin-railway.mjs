#!/usr/bin/env node
/** Run db:seed using Railway production Firebase credentials. */
import { execSync, spawnSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const backend = join(dirname(fileURLToPath(import.meta.url)), '..', 'backend');
const vars = JSON.parse(execSync('railway variable list --json', { cwd: backend, encoding: 'utf8' }));

const env = {
  ...process.env,
  FIREBASE_PROJECT_ID: vars.FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL: vars.FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY: vars.FIREBASE_PRIVATE_KEY,
  FIRESTORE_DATABASE_ID: vars.FIRESTORE_DATABASE_ID ?? '(default)',
  JWT_SECRET: vars.JWT_SECRET ?? 'x'.repeat(32),
  ADMIN_EMAIL: 'admin@tradepulse.io',
  ADMIN_PASSWORD: 'Admin123!ChangeMe',
};

const result = spawnSync('npm', ['run', 'db:seed'], {
  cwd: backend,
  env,
  stdio: 'inherit',
  shell: true,
});

process.exit(result.status ?? 1);
