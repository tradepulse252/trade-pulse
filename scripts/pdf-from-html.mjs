import puppeteer from 'puppeteer';
import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const htmlPath = join(root, 'docs', 'signal-formula.html');
const pdfPath = join(root, 'docs', 'TradePulse-Signal-Formula.pdf');

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle0' });
await page.pdf({
  path: pdfPath,
  format: 'A4',
  printBackground: true,
  margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
});
await browser.close();
console.log('PDF written:', pdfPath);
