# Complete deployment — TradePulse (Render + Vercel + Firebase)

One-page checklist. Do steps in order.

---

## Status

| Part | URL | Status |
|------|-----|--------|
| **Frontend** | https://tradepulse-vert.vercel.app | ✅ Live |
| **Frontend (target)** | https://tradepulse.vercel.app | ⏳ Claim in Vercel Domains |
| **Backend** | https://tradepulse-api.onrender.com | ❌ Create on Render (Step 1) |
| **Database** | Firebase `muchocoffee-tradepulse252` | ✅ Rules/indexes deployed |

---

## Step 1 — Render backend (YOU must click once)

1. **https://dashboard.render.com/blueprints/new**
2. Repo: **`tradepulse252/trade-pulse`** · Branch: **`main`**
3. Click **Apply**
4. Enter when prompted:
   - `FIREBASE_CLIENT_EMAIL` — from Firebase service account JSON
   - `FIREBASE_PRIVATE_KEY` — from same JSON
   - `RESEND_API_KEY` — optional
5. Wait until **`tradepulse-api`** is **Live**

**Firebase key:** https://console.firebase.google.com/project/muchocoffee-tradepulse252/settings/serviceaccounts/adminsdk → **Generate new private key**

Test:

```powershell
Invoke-WebRequest "https://tradepulse-api.onrender.com/api/health"
```

---

## Step 2 — Vercel (already done)

Project: **cmc252/tradepulse**

| Env var | Value |
|---------|-------|
| `NEXT_PUBLIC_API_URL` | `https://tradepulse-api.onrender.com` |
| `NEXT_PUBLIC_WS_URL` | `wss://tradepulse-api.onrender.com` |

Redeploy if you change Render URL:

```powershell
cd frontend
npx vercel --prod --yes
```

---

## Step 3 — Claim `tradepulse.vercel.app` (optional)

1. **https://vercel.com/cmc252/tradepulse** → **Settings** → **Domains**
2. Add **`tradepulse.vercel.app`** (free another project using this name first)
3. Render CORS already allows both `-vert` and `.vercel.app` URLs

---

## Step 4 — Seed admin (optional)

Save Firebase JSON as `backend/firebase-service-account.json`, then:

```powershell
cd backend
npm run db:seed
```

Login: `admin@tradepulse.io` / `Admin123!ChangeMe`

---

## Step 5 — Verify

| Test | Expected |
|------|----------|
| Render health | JSON from `/api/health` |
| https://tradepulse-vert.vercel.app | Dashboard loads |
| Register + login | Works |
| `/journal` | Save a trade |

---

## Automate Render env (optional)

If you have a Render API key + Firebase JSON:

```powershell
$env:RENDER_API_KEY = "rnd_..."
# save Firebase JSON → backend/firebase-service-account.json
npm run setup:render
npm run deploy:render
```

---

## Architecture

```
tradepulse-vert.vercel.app (Vercel)
        │
        ├── REST → tradepulse-api.onrender.com
        └── WS   → wss://tradepulse-api.onrender.com

Render (Docker) → Firebase Firestore
```
