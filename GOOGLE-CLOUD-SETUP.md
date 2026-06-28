# Google Cloud Setup — Trade-Pulse Backend (Always Free VM)

Deploy the Trade-Pulse API on a **free forever** Google Cloud `e2-micro` VM.

| Layer | Service |
|-------|---------|
| Frontend | Vercel — https://frontend-omega-two-31.vercel.app |
| Database | Firebase Firestore — `muchocoffee-tradepulse252` |
| Backend | Google Cloud Compute Engine (`e2-micro`) + Docker |

**Cost:** $0/month on Always Free (VM must stay in a US free region).

---

## Before you start

You need:

- Google account + **credit/debit card** (identity check — not charged unless you upgrade)
- Firebase service account JSON (Project Settings → Service Accounts → Generate key)
- SSH key pair (Windows: `ssh-keygen -t ed25519`)

**Important:** The free VM only works in these regions:

- `us-west1` (Oregon)
- `us-central1` (Iowa) — recommended
- `us-east1` (South Carolina)

---

## Step 1 — Create Google Cloud account

1. Open **https://cloud.google.com/free**
2. Click **Get started for free**
3. Complete signup (email, phone, billing profile)
4. You get **$300 trial credit for 90 days** — the `e2-micro` VM stays free after trial if you stay within Always Free limits

Console: **https://console.cloud.google.com/**

---

## Step 2 — Create the VM

1. Console → **Compute Engine** → **VM instances** → **Create instance**
2. Settings:

| Setting | Value |
|---------|-------|
| Name | `tradepulse-api` |
| Region | **us-central1** (or `us-west1` / `us-east1`) |
| Zone | Any in that region |
| Machine type | **e2-micro** (0.25–2 vCPU, 1 GB memory) — shows **Always Free eligible** |
| Boot disk | **Ubuntu 22.04 LTS**, **30 GB** standard persistent disk |
| Firewall | ✅ Allow HTTP traffic, ✅ Allow HTTPS traffic |

3. **Advanced options → Security → SSH Keys** → add your public key  
   (paste contents of `~/.ssh/id_ed25519.pub` or generate in console)

4. Click **Create**

5. Note the **External IP** (e.g. `34.xxx.xxx.xxx`)

---

## Step 3 — Open firewall for SSH (if needed)

Default: SSH (22) is usually open. HTTP/HTTPS are open if you checked those boxes.

Optional — test API on port 4000 before HTTPS:

1. **VPC network** → **Firewall** → **Create firewall rule**
2. Target: all instances, Ingress, TCP **4000**, Source `0.0.0.0/0`  
   (Remove this after Caddy is working — only use 80/443 in production.)

---

## Step 4 — SSH into the VM

```bash
ssh -i ~/.ssh/id_ed25519 YOUR_USERNAME@EXTERNAL_IP
```

Replace `YOUR_USERNAME` with your Linux username (often your Google account name, or `ubuntu` on Ubuntu images).

---

## Step 5 — Bootstrap the server

On the VM, run:

```bash
curl -fsSL https://raw.githubusercontent.com/tradepulse252/trade-pulse/main/scripts/gcp-bootstrap.sh | bash
```

Or clone the repo first:

```bash
git clone https://github.com/tradepulse252/trade-pulse.git
cd trade-pulse
bash scripts/gcp-bootstrap.sh
```

This installs Docker, Caddy, optional swap (helps on 1 GB RAM), and prepares `/opt/tradepulse`.

---

## Step 6 — Configure environment

Create `/opt/tradepulse/.env` on the VM:

```bash
sudo nano /opt/tradepulse/.env
```

Paste (replace secrets):

```env
NODE_ENV=production
PORT=4000
JWT_SECRET=your-64-char-random-secret-here-change-me-please-min-32-chars

FIREBASE_PROJECT_ID=muchocoffee-tradepulse252
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@muchocoffee-tradepulse252.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIRESTORE_DATABASE_ID=(default)

CORS_ORIGIN=https://frontend-omega-two-31.vercel.app
FRONTEND_URL=https://frontend-omega-two-31.vercel.app
EMAIL_USE_SMTP=false
PERSIST_MARKET_DATA=false

RESEND_API_KEY=
RESEND_FROM_ADDRESS=noreply@tradepulse.io
```

**Firebase private key:** keep `\n` for line breaks inside the quoted string.

---

## Step 7 — Deploy the backend

On the VM:

```bash
cd /opt/tradepulse
sudo bash scripts/gcp-deploy.sh
```

Or manually:

```bash
cd /opt/tradepulse/trade-pulse/backend
docker build -t tradepulse-api .
docker stop tradepulse-api 2>/dev/null || true
docker rm tradepulse-api 2>/dev/null || true
docker run -d \
  --name tradepulse-api \
  --restart unless-stopped \
  --env-file /opt/tradepulse/.env \
  -p 127.0.0.1:4000:4000 \
  tradepulse-api
```

Test locally on the VM:

```bash
curl http://127.0.0.1:4000/api/health
```

---

## Step 8 — HTTPS with Caddy

### Option A — Use your domain (recommended)

1. Point DNS **A record** `api.yourdomain.com` → VM **External IP**
2. Edit Caddy config:

```bash
sudo nano /etc/caddy/Caddyfile
```

```caddy
api.yourdomain.com {
    reverse_proxy 127.0.0.1:4000
}
```

3. Reload:

```bash
sudo systemctl reload caddy
```

4. Test:

```bash
curl https://api.yourdomain.com/api/health
```

### Option B — No domain (IP only, HTTP)

Use the external IP for testing only (no WSS from browser on HTTPS pages):

```text
http://EXTERNAL_IP/api/health
```

For production with Vercel (HTTPS frontend), you **need HTTPS** on the API — use a domain or Cloudflare Tunnel.

---

## Step 9 — Update Vercel

1. [Vercel Dashboard](https://vercel.com) → project **frontend** → **Settings → Environment Variables**
2. Set **Production**:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://api.yourdomain.com` |
| `NEXT_PUBLIC_WS_URL` | `wss://api.yourdomain.com` |

3. **Redeploy** production

PowerShell (from `frontend/`):

```powershell
echo "https://api.yourdomain.com" | npx vercel env add NEXT_PUBLIC_API_URL production --force
echo "wss://api.yourdomain.com" | npx vercel env add NEXT_PUBLIC_WS_URL production --force
npx vercel --prod --yes
```

---

## Step 10 — Seed admin user (optional)

On your **local machine** with Firebase credentials in `backend/.env`:

```bash
cd backend
npm run db:seed
```

Default admin: `admin@tradepulse.io` / `Admin123!ChangeMe` (change in production).

---

## Verify

| Check | URL |
|-------|-----|
| API health | `https://api.yourdomain.com/api/health` |
| Markets | `https://api.yourdomain.com/api/markets?limit=3` |
| Dashboard | https://frontend-omega-two-31.vercel.app |
| Trade Journal | https://frontend-omega-two-31.vercel.app/journal |

Register → sign in → add a journal entry → confirm it saves.

---

## Useful commands (on VM)

```bash
# Logs
docker logs -f tradepulse-api

# Restart after .env change
docker restart tradepulse-api

# Redeploy latest code
cd /opt/tradepulse && sudo bash scripts/gcp-deploy.sh

# Caddy status
sudo systemctl status caddy
```

---

## Always Free limits (avoid surprise charges)

| Resource | Free limit |
|----------|------------|
| VM | 1× `e2-micro` per month (US regions only) |
| Disk | 30 GB standard persistent disk |
| Egress | 1 GB/month from North America (check current GCP docs) |

**Do not:**

- Create VMs outside `us-west1`, `us-central1`, `us-east1` on free tier
- Upgrade to larger machine types without checking cost
- Leave unused static IPs or large disks running

Billing alerts: Console → **Billing** → **Budgets & alerts** → set $1 alert.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| VM slow / OOM | Bootstrap enables 2 GB swap; restart Docker |
| `curl` health fails | `docker logs tradepulse-api` — check Firebase env vars |
| CORS errors | Match `CORS_ORIGIN` exactly to Vercel URL (no trailing slash) |
| WebSocket fails | Use `wss://` with valid HTTPS cert on API domain |
| Firebase auth error | Fix `FIREBASE_PRIVATE_KEY` — escaped `\n` in `.env` |

---

## Architecture

```
Vercel (Next.js)
    │
    ├── REST → https://api.yourdomain.com/api/*
    └── WS   → wss://api.yourdomain.com/ws

GCP e2-micro VM
    ├── Caddy :443 → 127.0.0.1:4000
    └── Docker: tradepulse-api (backend/Dockerfile)

Firebase Firestore ← Admin SDK
```

---

## Links

| Resource | URL |
|----------|-----|
| Google Cloud Free | https://cloud.google.com/free |
| Console | https://console.cloud.google.com/compute/instances |
| Always Free docs | https://cloud.google.com/free/docs/free-cloud-features |
| Firebase Console | https://console.firebase.google.com/ |
