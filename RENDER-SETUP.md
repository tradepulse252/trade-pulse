# Render Setup — Trade-Pulse Backend (new account)

Deploy the API on your **new Render account**. Frontend stays on **Vercel**, database on **Firebase Firestore**.

| Layer | Service |
|-------|---------|
| Frontend | Vercel — https://tradepulse.vercel.app |
| Backend | Render Web Service (Docker) |
| Database | Firebase — `muchocoffee-tradepulse252` |

**Sign up:** https://render.com/ (no credit card required on free tier)

**Note:** Free Render services **sleep after ~15 minutes** with no traffic. First request after sleep may take **30–60 seconds**. WebSockets can disconnect when idle.

---

## Step 1 — Sign in to your new Render account

1. Open **https://dashboard.render.com/**
2. Sign up or log in (GitHub is easiest)
3. Use your **new** account — do not reuse the old Render workspace if you switched accounts

---

## Step 2 — Connect GitHub

1. Render Dashboard → **Account Settings** → **Connect GitHub** (or during first service creation)
2. Grant access to **`tradepulse252/trade-pulse`**
3. If the repo is missing: **Configure GitHub app** → add the repository

---

## Step 3 — Deploy (pick A or B)

### Option A — Blueprint (fastest, uses `render.yaml`)

1. **New** → **Blueprint**
2. Connect repository **`tradepulse252/trade-pulse`**
3. Branch: **`main`**
4. Render detects **`render.yaml`** at repo root
5. When prompted for secret env vars, enter:
   - `FIREBASE_CLIENT_EMAIL` — from Firebase service account JSON
   - `FIREBASE_PRIVATE_KEY` — from JSON (`private_key` field, keep `\n` line breaks)
   - `RESEND_API_KEY` — optional (password reset emails)
6. Click **Apply** → wait for build (~5–10 min)

### Option B — Manual Web Service

1. **New** → **Web Service**
2. Connect **`tradepulse252/trade-pulse`**, branch **`main`**
3. Settings:

| Field | Value |
|-------|-------|
| Name | `tradepulse-api` |
| Region | Frankfurt (EU) or Oregon (US) |
| Instance type | **Free** |
| Root Directory | `backend` |
| Runtime | **Docker** |
| Dockerfile path | `Dockerfile` (relative to `backend/`) |
| Health Check Path | `/api/health` |

4. Add environment variables (Step 4 below)
5. **Create Web Service**

---

## Step 4 — Environment variables

In the service → **Environment**:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | Random string **32+ chars** (Render can auto-generate in Blueprint) |
| `FIREBASE_PROJECT_ID` | `muchocoffee-tradepulse252` |
| `FIREBASE_CLIENT_EMAIL` | From Firebase JSON → `client_email` |
| `FIREBASE_PRIVATE_KEY` | From Firebase JSON → `private_key` |
| `FIRESTORE_DATABASE_ID` | `(default)` |
| `CORS_ORIGIN` | `https://tradepulse.vercel.app` |
| `FRONTEND_URL` | `https://tradepulse.vercel.app` |
| `EMAIL_USE_SMTP` | `false` |
| `PERSIST_MARKET_DATA` | `false` |
| `RESEND_API_KEY` | Optional |
| `RESEND_FROM_ADDRESS` | `noreply@tradepulse.io` |

**Firebase key:** paste `private_key` with `\n` for newlines, or use multiline paste if Render allows.

**Do not set `PORT`** — Render injects it automatically.

**Save** → service redeploys.

---

## Step 5 — Get your Render URL

After deploy succeeds:

1. Open service **`tradepulse-api`**
2. Copy the URL at the top, e.g.:

```text
https://tradepulse-api.onrender.com
```

Test:

```powershell
curl https://tradepulse-api.onrender.com/api/health
curl "https://tradepulse-api.onrender.com/api/markets?limit=3"
```

First request after sleep may be slow — wait up to 60 seconds.

If health fails: **Logs** tab → check Firebase env vars.

---

## Step 6 — Update Vercel (point frontend to new Render URL)

1. **https://vercel.com** → frontend project → **Settings** → **Environment Variables**
2. Update **Production**:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://tradepulse-api.onrender.com` |
| `NEXT_PUBLIC_WS_URL` | `wss://tradepulse-api.onrender.com` |

Use your **actual** Render URL (replace hostname if different).

3. **Deployments** → **Redeploy** production

PowerShell:

```powershell
cd frontend
echo "https://tradepulse-api.onrender.com" | npx vercel env add NEXT_PUBLIC_API_URL production --force
echo "wss://tradepulse-api.onrender.com" | npx vercel env add NEXT_PUBLIC_WS_URL production --force
npx vercel --prod --yes
```

---

## Step 7 — Remove old backend URLs (if any)

- Delete or suspend the **old** Render service on the previous account (avoid confusion)
- Remove old `NEXT_PUBLIC_*` values pointing to Northflank or old `*.onrender.com` URLs
- Update any bookmarks / docs to the new URL

---

## Step 8 — Seed admin (optional)

On your PC with `backend/.env` configured:

```powershell
cd backend
npm run db:seed
```

Default: `admin@tradepulse.io` / `Admin123!ChangeMe`

---

## Verify

| Check | URL |
|-------|-----|
| API health | `https://YOUR-SERVICE.onrender.com/api/health` |
| Dashboard | https://tradepulse.vercel.app |
| Register / Login | Should work immediately (no email verification) |
| Journal | `/journal` — save a trade |

---

## Push `render.yaml` first (if using Blueprint)

If `render.yaml` is not on GitHub yet:

```powershell
cd C:\Users\HP\OneDrive\Documents\TradePulse
git add render.yaml RENDER-SETUP.md
git commit -m "Add Render deployment blueprint and setup guide"
git push origin main
```

Then run **Option A** (Blueprint) in Render.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Build fails | Root Directory = `backend`, Dockerfile = `Dockerfile` |
| 502 / timeout on first visit | Free tier waking up — wait 30–60s, retry |
| Health check fails | Logs → fix `FIREBASE_PRIVATE_KEY` or `JWT_SECRET` |
| CORS error | `CORS_ORIGIN` must match Vercel URL exactly (no `/` at end) |
| WebSocket drops | Free tier sleep — upgrade to paid or accept reconnect |
| Wrong repo/account | New Render account must connect GitHub and own the repo access |

---

## Architecture

```
Vercel (frontend)
    │
    ├── REST → https://tradepulse-api.onrender.com/api/*
    └── WS   → wss://tradepulse-api.onrender.com/ws

Render (Docker, backend/)
    └── Firebase Firestore
```
