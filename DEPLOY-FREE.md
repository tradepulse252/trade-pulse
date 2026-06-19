# Deploy Trade-Pulse FREE (Easiest Path)

Deploy the full app online for **$0/month** using free tiers.

| Service | Hosts | Free Tier |
|---------|-------|-----------|
| **GitHub** | Your code (edit online) | Unlimited public repos |
| **Vercel** | Next.js frontend | Free forever |
| **Render** | Node.js backend + WebSocket | 750 hrs/month free |
| **Neon** | PostgreSQL database | 0.5 GB free |
| **Upstash** | Redis (optional) | 10k commands/day free |

> **Total time:** ~20 minutes · **Cost:** $0

---

## Step 1 — Put Code on GitHub (code online)

1. Create account at [github.com](https://github.com)
2. Create a new repository: `trade-pulse` (Public)
3. Push your project:

```bash
cd C:\Users\HP\OneDrive\Documents\TradePulse
git init
git add .
git commit -m "Trade-Pulse initial deploy"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/trade-pulse.git
git push -u origin main
```

**Edit code online:** Open your repo on GitHub → press `.` (dot) to open the web editor, or use **GitHub Codespaces** (free 60 hrs/month).

---

## Step 2 — Free Database (Neon)

1. Go to [neon.tech](https://neon.tech) → Sign up free
2. Create project: `tradepulse`
3. Copy the connection string:
   ```
   postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```
4. Save it — you'll use this as `DATABASE_URL`

---

## Step 3 — Deploy Backend (Render) — FREE

1. Go to [render.com](https://render.com) → Sign up with GitHub
2. Click **New +** → **Blueprint** (or **Web Service**)
3. Connect your `trade-pulse` GitHub repo
4. If using Blueprint: Render reads `render.yaml` automatically
5. If manual setup:

| Setting | Value |
|---------|-------|
| **Name** | `tradepulse-api` |
| **Root Directory** | `backend` |
| **Runtime** | Node |
| **Build Command** | `npm install && npx prisma generate && npm run build` |
| **Start Command** | `npx prisma migrate deploy && npm start` |
| **Plan** | **Free** |

6. Add **Environment Variables**:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Your Neon connection string |
| `JWT_SECRET` | Random 64-char string ([generate](https://generate-secret.vercel.app/64)) |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | `https://YOUR-APP.vercel.app` (fill after Step 4) |
| `BINANCE_REST_BASE` | `https://fapi.binance.com` |
| `BINANCE_WS_BASE` | `wss://fstream.binance.com` |
| `MIN_VOLUME_USDT` | `1000000` |
| `SCORING_INTERVAL_MS` | `5000` |

7. Click **Deploy** → wait ~5 min
8. Copy your backend URL: `https://tradepulse-api.onrender.com`

> ⚠️ Free Render sleeps after 15 min idle. First visit takes ~30s to wake up.

---

## Step 4 — Deploy Frontend (Vercel) — FREE

1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
2. Click **Add New Project** → Import `trade-pulse` repo
3. Configure:

| Setting | Value |
|---------|-------|
| **Framework** | Next.js |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` (default) |

4. Add **Environment Variables**:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://tradepulse-api.onrender.com` |
| `NEXT_PUBLIC_WS_URL` | `wss://tradepulse-api.onrender.com` |

5. Click **Deploy** → get URL: `https://trade-pulse-xxx.vercel.app`

6. Go back to **Render** → update `CORS_ORIGIN` to your Vercel URL → redeploy

---

## Step 5 — Verify Live

1. Open your Vercel URL
2. Dashboard should load with live Binance data
3. Check API: `https://tradepulse-api.onrender.com/api/health`
4. Check settings: `https://YOUR-APP.vercel.app/settings`

---

## Optional: Free Redis (Upstash)

Only needed for caching at scale. App works without it.

1. [upstash.com](https://upstash.com) → Create free Redis database
2. Copy `REDIS_URL`
3. Add to Render env: `REDIS_URL=rediss://...`

---

## Optional: Binance API Keys

Public market data works without keys. To add your keys:

1. [Binance API Management](https://www.binance.com/en/my/settings/api-management) → Read Only key
2. Add to Render:
   - `BINANCE_API_KEY=...`
   - `BINANCE_API_SECRET=...`

---

## Architecture (Free)

```
User Browser
    ↓
Vercel (Frontend)          ← FREE · trade-pulse.vercel.app
    ↓ API + WebSocket
Render (Backend)           ← FREE · tradepulse-api.onrender.com
    ↓                        (sleeps when idle)
Neon (PostgreSQL)          ← FREE · 0.5GB
    ↓
Binance Futures API        ← FREE public endpoints
```

---

## Limitations (Free Tier)

| Limit | Impact |
|-------|--------|
| Render sleeps after 15 min | First load slow (~30s) |
| Neon 0.5 GB storage | Enough for months of metrics |
| Vercel 100 GB bandwidth | Fine for thousands of users |
| No custom domain on free | Use `.vercel.app` subdomain |

---

## Upgrade Path (when you grow)

| Need | Upgrade to |
|------|-----------|
| Backend always on | Render Starter $7/mo |
| More DB storage | Neon Pro $19/mo |
| Custom domain | Vercel Pro $20/mo |
| Mobile app | Firebase free tier |

---

## Troubleshooting

**Dashboard shows "Offline"**
- Backend is sleeping → visit `https://tradepulse-api.onrender.com/api/health` first
- Check `NEXT_PUBLIC_API_URL` in Vercel matches Render URL

**CORS error in browser console**
- Set `CORS_ORIGIN` on Render to exact Vercel URL (no trailing slash)

**Database connection failed**
- Ensure Neon connection string has `?sslmode=require`
- Run migrations: Render start command includes `prisma migrate deploy`

**WebSocket not connecting**
- Use `wss://` not `ws://` in `NEXT_PUBLIC_WS_URL`
- Render free tier supports WebSockets

---

## One-Command Local Test Before Deploy

```bash
# Test production build locally
cd backend && npm run build && npm start
cd frontend && npm run build && npm start
```

Your app will be live at:
- **Frontend:** `https://your-app.vercel.app`
- **API:** `https://tradepulse-api.onrender.com`
- **Code:** `https://github.com/your-username/trade-pulse`
