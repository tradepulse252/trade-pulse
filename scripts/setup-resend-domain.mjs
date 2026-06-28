/**
 * Add tradepulse.io to Resend and print DNS records / verification status.
 * Usage: node scripts/setup-resend-domain.mjs
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const DOMAIN = 'tradepulse.io';

function loadEnv() {
  for (const file of [join(root, '.env'), join(root, 'backend', '.env')]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  }
}

loadEnv();

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  console.error('RESEND_API_KEY not found in .env');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${apiKey}`,
  'Content-Type': 'application/json',
};

async function api(method, path, body) {
  const res = await fetch(`https://api.resend.com${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(data.message || data.error || res.statusText);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function main() {
  let domainId = null;
  let domain = null;

  try {
    const list = await api('GET', '/domains');
    domain = (list.data || []).find((d) => d.name === DOMAIN);
    if (domain) {
      domainId = domain.id;
      console.log(`Found existing domain: ${DOMAIN} (${domain.status})`);
    }
  } catch (e) {
    console.warn('List domains:', e.message);
  }

  if (!domainId) {
    try {
      const created = await api('POST', '/domains', { name: DOMAIN });
      domainId = created.id;
      console.log(`Added domain: ${DOMAIN} (${created.status})`);
    } catch (e) {
      if (e.status === 409 || e.message?.includes('already')) {
        const list = await api('GET', '/domains');
        domain = (list.data || []).find((d) => d.name === DOMAIN);
        domainId = domain?.id;
      } else {
        throw e;
      }
    }
  }

  if (!domainId) {
    console.error('Could not get domain id');
    process.exit(1);
  }

  const detail = await api('GET', `/domains/${domainId}`);
  console.log('\n--- Domain status ---');
  console.log(`Name:   ${detail.name}`);
  console.log(`Status: ${detail.status}`);

  const records = detail.records || [];
  if (records.length) {
    console.log('\n--- DNS records (add at your domain registrar) ---');
    for (const r of records) {
      console.log(`\n${r.type} ${r.name}`);
      console.log(`  Value: ${r.value}`);
      console.log(`  Status: ${r.status || 'pending'}`);
    }
  }

  if (detail.status === 'verified') {
    console.log('\n✓ Domain verified — ready for noreply@tradepulse.io');
    process.exit(0);
  }

  console.log('\n⏳ Domain not verified yet. Add DNS records above, then re-run this script.');
  process.exit(2);
}

main().catch((e) => {
  console.error('Error:', e.message, e.data || '');
  process.exit(1);
});
