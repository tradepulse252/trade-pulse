# Railway Setup — Trade-Pulse Backend

Deploy the API on **Railway** (replaces Render). Frontend stays on **Vercel**.

| Layer | Service |
|-------|---------|
| Frontend | **https://tradepulses.vercel.app** |
| Backend | Railway (Docker) |
| Database | Firebase `muchocoffee-tradepulse252` |

**Sign up:** https://railway.app/

---

## Step 1 — Create project

1. Open **https://railway.app/new**
2. **Deploy from GitHub repo**
3. Select **`tradepulse252/trade-pulse`**
4. Railway creates a service — open it → **Settings**

---

## Step 2 — Service settings

| Setting | Value |
|---------|-------|
| **Root Directory** | `backend` |
| **Config file** | `/backend/railway.toml` |
| **Builder** | Dockerfile (auto from config) |
| **Health check** | `/api/health` |

Click **Deploy** if needed.

---

## Step 3 — Public networking

1. Service → **Settings** → **Networking**
2. Click **Generate Domain**
3. Copy URL, e.g.:

```text
https://tradepulse-api-production.up.railway.app
```

---

## Step 4 — Environment variables

Service → **Variables** → add:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | Random 32+ char string |
| `FIREBASE_PROJECT_ID` | `muchocoffee-tradepulse252` |
| `FIREBASE_CLIENT_EMAIL` | From Firebase service account JSON |
| `FIREBASE_PRIVATE_KEY` | From Firebase JSON (`private_key`, keep `\n`) |
| `FIRESTORE_DATABASE_ID` | `(default)` |
| `CORS_ORIGIN` | `https://tradepulses.vercel.app` |
| `FRONTEND_URL` | `https://tradepulses.vercel.app` |
| `EMAIL_USE_SMTP` | `false` |
| `PERSIST_MARKET_DATA` | `false` |
| `RESEND_FROM_ADDRESS` | `noreply@tradepulse.io` |
| `RESEND_API_KEY` | Optional |

**Do not set `PORT`** — Railway injects it automatically.

Firebase key: Project Settings → Service accounts → **Generate new private key**

Redeploy after saving variables.

---

## Step 5 — Test API

```powershell
Invoke-RestMethod "https://YOUR-RAILWAY-URL.up.railway.app/api/health"
Invoke-RestMethod "https://YOUR-RAILWAY-URL.up.railway.app/api/markets?limit=3"
```

---

## Step 6 — Update Vercel

On the Vercel project for **tradepulses.vercel.app** → **Settings → Environment Variables**:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://YOUR-RAILWAY-URL.up.railway.app` |
| `NEXT_PUBLIC_WS_URL` | `wss://YOUR-RAILWAY-URL.up.railway.app` |

**Redeploy** frontend.

CLI (if linked to that Vercel project):

```powershell
cd frontend
echo "https://YOUR-RAILWAY-URL.up.railway.app" | npx vercel env add NEXT_PUBLIC_API_URL production --force
echo "wss://YOUR-RAILWAY-URL.up.railway.app" | npx vercel env add NEXT_PUBLIC_WS_URL production --force
npx vercel --prod --yes
```

---

## Step 7 — Verify app

| Check | URL |
|-------|-----|
| API health | `https://YOUR-RAILWAY-URL/api/health` |
| App | https://tradepulses.vercel.app |
| Register / login | Immediate (no email verification) |
| Journal | `/journal` — save a trade |

---

## Optional — seed admin

Save Firebase JSON as `backend/firebase-service-account.json`:

```powershell
cd backend
npm run db:seed
```

Default: `admin@tradepulse.io` / `Admin123!ChangeMe`

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Build fails | Root Directory = `backend`, Dockerfile present |
| Health check fails | Check `FIREBASE_PRIVATE_KEY` format |
| CORS errors | `CORS_ORIGIN` = `https://tradepulses.vercel.app` (no trailing `/`) |
| WebSocket fails | Use `wss://` on Vercel env |
| Out of credits | Railway Hobby plan ~$5/mo |

---

## Architecture

```
https://tradepulses.vercel.app (Vercel, frontend/)
        │
        ├── REST → Railway API
        └── WS   → wss://Railway

Railway (Docker, backend/) → Firebase Firestore
```

---

## Automate (optional)

With Railway CLI + token:

```powershell
npm i -g @railway/cli
railway login
cd backend
railway link
railway up
```

Or set `RAILWAY_TOKEN` and run `npm run setup:railway` (see script in repo).
