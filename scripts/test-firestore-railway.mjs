#!/usr/bin/env node
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const backend = join(dirname(fileURLToPath(import.meta.url)), '..', 'backend');
const vars = JSON.parse(execSync('railway variable list --json', { cwd: backend, encoding: 'utf8' }));

function normalizePrivateKey(raw) {
  let key = raw.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, '\n');
}

process.env.FIREBASE_PROJECT_ID = vars.FIREBASE_PROJECT_ID;
process.env.FIREBASE_CLIENT_EMAIL = vars.FIREBASE_CLIENT_EMAIL;
process.env.FIREBASE_PRIVATE_KEY = normalizePrivateKey(vars.FIREBASE_PRIVATE_KEY ?? '');
process.env.FIRESTORE_DATABASE_ID = vars.FIRESTORE_DATABASE_ID ?? '(default)';
process.env.JWT_SECRET = vars.JWT_SECRET ?? 'x'.repeat(32);

const firebasePath = pathToFileURL(join(backend, 'dist/lib/firebase.js')).href;
const { initFirebase, pingFirestore } = await import(firebasePath);

const ok = await initFirebase();
console.log('init:', ok);
if (ok) {
  console.log('ping:', await pingFirestore());
}
