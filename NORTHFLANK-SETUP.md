# Northflank Setup — Manual Dashboard Guide

Complete these 5 steps in order. Your repo is already configured for Northflank.

---

## Step 1 — Sign up & connect GitHub

1. Go to [northflank.com](https://northflank.com) and create an account
2. **Team settings → Integrations → GitHub** → connect `tradepulse252/trade-pulse`
3. Allow Northflank to read the repository

---

## Step 2 — Create project & service

1. **New project** → name: `tradepulse` → region: **Europe West**
2. **Add service → Combined** (build + deploy in one)
3. Configure **Build**:

| Setting | Value |
|---------|-------|
| Name | `tradepulse-api` |
| Repository | `tradepulse252/trade-pulse` |
| Branch | `main` |
| Dockerfile path | `/backend/Dockerfile` |
| Docker work directory | `/backend` |

4. Configure **Deploy**:

| Setting | Value |
|---------|-------|
| Port | `4000` |
| Public | Yes |
| Health check path | `/api/health` |
| Health check port | `4000` |

5. Click **Create** → wait for first build (~5–10 min)

---

## Step 3 — Add secrets (Environment variables)

In the service → **Environment** tab, add:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `4000` |
| `JWT_SECRET` | 64+ char random string |
| `FIREBASE_PROJECT_ID` | `muchocoffee-tradepulse252` |
| `FIREBASE_CLIENT_EMAIL` | From Firebase service account JSON |
| `FIREBASE_PRIVATE_KEY` | From Firebase service account JSON (keep `\n` newlines) |
| `FIRESTORE_DATABASE_ID` | `(default)` |
| `CORS_ORIGIN` | `https://frontend-omega-two-31.vercel.app` |
| `FRONTEND_URL` | `https://frontend-omega-two-31.vercel.app` |
| `EMAIL_USE_SMTP` | `false` |
| `PERSIST_MARKET_DATA` | `false` |
| `RESEND_API_KEY` | Your Resend key (optional, for auth emails) |
| `RESEND_FROM_ADDRESS` | `noreply@tradepulse.io` |

**Firebase service account:** Firebase Console → Project Settings → Service Accounts → **Generate new private key** → save as `backend/firebase-service-account.json` locally (never commit).

**Redeploy** the service after adding env vars.

---

## Step 4 — Copy your Northflank URL

After deploy succeeds, open the service → **Ports** tab.

Copy the public URL, e.g.:

```text
https://tradepulse-api--tradepulse.code.run
```

Verify:

```bash
curl https://YOUR-URL/api/health
curl https://YOUR-URL/api/markets?limit=3
```

---

## Step 5 — Update Vercel & redeploy frontend

1. [Vercel Dashboard](https://vercel.com) → project **frontend** → **Settings → Environment Variables**
2. Add or update **Production**:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://YOUR-NORTHFLANK-URL` |
| `NEXT_PUBLIC_WS_URL` | `wss://YOUR-NORTHFLANK-URL` |

3. **Deployments → Redeploy** latest production build

Or from terminal (in `frontend/`):

```powershell
echo "https://YOUR-NORTHFLANK-URL" | npx vercel env add NEXT_PUBLIC_API_URL production --force
echo "wss://YOUR-NORTHFLANK-URL" | npx vercel env add NEXT_PUBLIC_WS_URL production --force
npx vercel --prod --yes
```

---

## Verify everything works

| Check | URL |
|-------|-----|
| Dashboard | https://frontend-omega-two-31.vercel.app |
| Trade Journal | https://frontend-omega-two-31.vercel.app/journal |
| Admin (ADMIN only) | https://frontend-omega-two-31.vercel.app/admin |
| API health | `https://YOUR-NORTHFLANK-URL/api/health` |

Sign in → add a trade in Journal → confirm it saves.

---

## Optional: Import template instead

Northflank → **Templates → Create from JSON** → paste `.northflank/template.json` → add secret overrides → Run.

---

## Optional: Automate later

When you have an API token:

```powershell
$env:NORTHFLANK_API_KEY = "your-token"
# Place backend/firebase-service-account.json first
npm run setup:northflank
```
