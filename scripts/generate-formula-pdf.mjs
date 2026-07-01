#!/usr/bin/env node
/**
 * Generates docs/TradePulse-Signal-Formula.pdf from docs/signal-formula.html
 * Usage: node scripts/generate-formula-pdf.mjs
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const htmlPath = join(root, 'docs', 'signal-formula.html');

if (!existsSync(htmlPath)) {
  console.error('Missing:', htmlPath);
  process.exit(1);
}

let hasPuppeteer = spawnSync('node', ['-e', "import('puppeteer')"], {
  cwd: root,
  stdio: 'pipe',
  shell: true,
}).status === 0;

if (!hasPuppeteer) {
  console.log('Installing puppeteer...');
  const install = spawnSync('npm', ['install', 'puppeteer@^24', '--no-save'], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  });
  if (install.status !== 0) process.exit(1);
}

console.log('Generating PDF...');
const run = spawnSync('node', [join(__dirname, 'pdf-from-html.mjs')], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
});

process.exit(run.status ?? 1);
