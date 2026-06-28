# Complete deployment — TradePulse (Render + Vercel + Firebase)

---

## Live URLs

| Part | URL |
|------|-----|
| **Frontend** | **https://tradepulses.vercel.app** |
| **GitHub** | https://github.com/tradepulse252/trade-pulse |
| **Backend** | https://tradepulse-api.onrender.com |
| **Firebase** | `muchocoffee-tradepulse252` |

---

## Step 1 — Render backend

1. **https://dashboard.render.com/blueprints/new**
2. Repo: **`tradepulse252/trade-pulse`** · Branch: **`main`**
3. **Apply** → enter `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`
4. Wait for **Live**

Render CORS is set to **`https://tradepulses.vercel.app`** in `render.yaml`.

---

## Step 2 — Vercel frontend

Project should import from **GitHub → `tradepulse252/trade-pulse`** with **Root Directory: `frontend`**.

Production domain: **https://tradepulses.vercel.app**

Env vars (Production):

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://tradepulse-api.onrender.com` |
| `NEXT_PUBLIC_WS_URL` | `wss://tradepulse-api.onrender.com` |

---

## Step 3 — Verify

```powershell
Invoke-WebRequest "https://tradepulse-api.onrender.com/api/health"
Invoke-WebRequest "https://tradepulses.vercel.app"
```

Register → login → `/journal` → save a trade.

---

## Architecture

```
https://tradepulses.vercel.app (Vercel, frontend/)
        │
        ├── REST → tradepulse-api.onrender.com
        └── WS   → wss://tradepulse-api.onrender.com

Render (Docker backend/) → Firebase Firestore
```
