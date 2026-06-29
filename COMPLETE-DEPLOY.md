# Complete deployment — Trade-Pulse

## Live URLs

| Part | URL |
|------|-----|
| **Frontend** | **https://tradepulses.vercel.app** |
| **Backend** | Railway — set after Step 1 |
| **GitHub** | https://github.com/tradepulse252/trade-pulse |
| **Firebase** | `muchocoffee-tradepulse252` |

---

## 1. Railway backend

Follow **`RAILWAY-SETUP.md`**:

1. https://railway.app/new → GitHub → `trade-pulse`
2. Root Directory: **`backend`**
3. Generate public domain
4. Add Firebase + JWT env vars
5. Test `/api/health`

---

## 2. Vercel frontend

Project: **tradepulses.vercel.app**

| Env var | Value |
|---------|-------|
| `NEXT_PUBLIC_API_URL` | Your Railway HTTPS URL |
| `NEXT_PUBLIC_WS_URL` | `wss://` same host |

Redeploy.

See **`VERCEL-TRADEPULSES.md`**.

---

## 3. Verify

- Register at https://tradepulses.vercel.app
- Journal → save a trade
- Admin → `/admin` (after seed)

---

## Quick commands

```powershell
npm run setup:railway
cd backend && npm run db:seed   # needs firebase-service-account.json
```
