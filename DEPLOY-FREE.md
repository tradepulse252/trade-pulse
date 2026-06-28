# Deploy Trade-Pulse FREE (Vercel + Backend + Firestore)

Deploy the full app online using free/low-cost tiers.

| Service | Hosts | Role |
|---------|-------|------|
| **GitHub** | Source code | Version control |
| **Vercel** | Next.js frontend | Dashboard, Signals, Journal UI |
| **Backend** | **Render** (free) or Northflank | API, auth, journal CRUD, WebSocket |
| **Firebase Firestore** | Database | Users, journal, watchlist |
| **Upstash** | Redis (optional) | Cache |

> **Easiest backend (no card):** Render — see **`RENDER-SETUP.md`**  
> **Alternative:** Northflank — see **`NORTHFLANK-SETUP.md`**

> **Total time:** ~30–45 minutes · **Cost:** $0 on Always Free tiers

---

## Step 1 — GitHub

Repo: [github.com/tradepulse252/trade-pulse](https://github.com/tradepulse252/trade-pulse)

Push latest `main` before deploying.

---

## Step 2 — Firebase Firestore

1. Project: `muchocoffee-tradepulse252` (or create your own)
2. Enable Firestore (production mode)
3. Deploy rules/indexes from repo root:

```bash
npx firebase-tools deploy --only firestore --project muchocoffee-tradepulse252
```

4. Create a **service account** → download JSON → note:
   - `project_id`
   - `client_email`
   - `private_key`

5. Seed admin user (local, with env set):

```bash
cd backend
# set FIREBASE_* and ADMIN_EMAIL / ADMIN_PASSWORD in .env
npm run db:seed
```

---

## Step 3 — Deploy Backend (Northflank)

### Option A — Import template (fastest)

1. Go to [northflank.com](https://northflank.com) → sign up
2. **Templates** → **Create** → paste `.northflank/template.json`
3. Set arguments:
   - `frontendUrl` = your Vercel URL
   - `firebaseProjectId` = your Firebase project
4. Add secrets in the Secret Group after creation:
   - `JWT_SECRET`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
   - `RESEND_API_KEY` (optional)
5. Run template → wait for build + deploy
6. Copy public URL, e.g. `https://tradepulse-api--tradepulse.code.run`

See also `northflank.yaml` for manual UI settings.

### Option B — Manual service

1. **New project** → `tradepulse`
2. **Build service** → GitHub repo → branch `main`
   - Dockerfile: `/backend/Dockerfile`
   - Work dir: `/backend`
3. **Deployment service** → deploy from build → port **4000**
4. Health check: `/api/health`
5. Add env vars from `northflank.yaml`

---

## Step 4 — Deploy Frontend (Vercel)

Production URL: **https://frontend-omega-two-31.vercel.app**

Environment variables (Vercel → Settings → Environment Variables):

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://YOUR-NORTHFLANK-URL` |
| `NEXT_PUBLIC_WS_URL` | `wss://YOUR-NORTHFLANK-URL` |

Redeploy frontend after saving env vars.

Vercel fallback routes (`/api/markets`, `/api/signals`, `/api/opportunities`) still work if Northflank is briefly unavailable.

---

## Step 5 — Verify

```bash
curl https://YOUR-NORTHFLANK-URL/api/health
curl https://YOUR-NORTHFLANK-URL/api/markets?limit=3
```

Frontend:

- Dashboard: `/`
- Trade Journal: `/journal` (sign in required)
- Admin: `/admin` (ADMIN role only)

---

## Architecture

```
Vercel (Frontend + fallback API)
        │
        ├── REST  → Northflank API (/api/*)
        ├── WS    → Northflank WebSocket (/ws)
        └── Auth/Journal → Northflank + Firestore

Firebase Firestore ← Admin SDK (Northflank backend)
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS errors | Set `CORS_ORIGIN` on Northflank = exact Vercel URL (no trailing slash) |
| Journal 401 | Sign in; check `JWT_SECRET` on Northflank |
| Empty dashboard | Wait ~30s for aggregation; or Vercel fallback loads markets |
| Email not sent | Set `RESEND_API_KEY` + verified domain; keep `EMAIL_USE_SMTP=false` |
| Admin nav missing | User must have `ADMIN` role (run `db:seed`) |

---

## Optional: Redis (Upstash)

1. Create free Redis at [upstash.com](https://upstash.com)
2. Add `REDIS_URL` to Northflank secret group
3. Redeploy backend

---

## Migrate from old Render / Northflank

If you created a **new Render account**, follow **`RENDER-SETUP.md`**, then update Vercel `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` to the new `*.onrender.com` URL. Delete the old backend service to avoid confusion.
