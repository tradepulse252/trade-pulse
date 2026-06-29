#!/usr/bin/env node
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const backend = join(dirname(fileURLToPath(import.meta.url)), '..', 'backend');
const raw = execSync('railway variable list --json', { cwd: backend, encoding: 'utf8' });
const v = JSON.parse(raw);
const key = v.FIREBASE_PRIVATE_KEY ?? '';
const jwt = v.JWT_SECRET ?? '';

console.log('JWT_SECRET length:', jwt.length, jwt.length >= 32 ? 'OK' : 'TOO SHORT');
console.log('FIREBASE_PRIVATE_KEY length:', key.length);
console.log('Has BEGIN:', key.includes('BEGIN PRIVATE KEY'));
console.log('Has literal \\n:', key.includes('\\n'));
console.log('Has real newlines:', key.includes('\n'));
console.log('Wrapped in quotes:', key.startsWith('"') && key.endsWith('"'));
console.log('RESEND_FROM_ADDRESS:', v.RESEND_FROM_ADDRESS ? 'set' : 'missing');
console.log('Public domain:', v.RAILWAY_PUBLIC_DOMAIN);
