#!/usr/bin/env node
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import crypto from 'crypto';

const backend = join(dirname(fileURLToPath(import.meta.url)), '..', 'backend');
const vars = JSON.parse(execSync('railway variable list --json', { cwd: backend, encoding: 'utf8' }));
const raw = vars.FIREBASE_PRIVATE_KEY ?? '';

function variants(label, key) {
  try {
    crypto.createPrivateKey(key);
    console.log(label, 'VALID');
    return true;
  } catch (e) {
    console.log(label, 'INVALID:', e.message.split('\n')[0]);
    return false;
  }
}

let k = raw.trim();
console.log('raw len', k.length, 'starts', k[0], 'ends', k[k.length - 1]);

variants('raw', k);
if (k.startsWith('"') && k.endsWith('"')) {
  k = k.slice(1, -1);
  variants('strip quotes', k);
}
variants('replace \\n', k.replace(/\\n/g, '\n'));
variants('replace \\\\n', k.replace(/\\\\n/g, '\n'));
variants('strip+replace \\n', k.replace(/^"|"$/g, '').replace(/\\n/g, '\n'));
