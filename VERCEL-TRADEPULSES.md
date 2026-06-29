# Vercel — tradepulses.vercel.app

Connect frontend to **Railway** backend.

---

## Environment variables (Production)

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://YOUR-SERVICE.up.railway.app` |
| `NEXT_PUBLIC_WS_URL` | `wss://YOUR-SERVICE.up.railway.app` |

Replace with your Railway public domain from **Networking → Generate Domain**.

---

## Git connection

1. Vercel → project **tradepulses**
2. **Settings → Git** → `tradepulse252/trade-pulse`
3. **Root Directory:** `frontend`
4. Branch: `main`

---

## Redeploy

```powershell
cd frontend
npx vercel env add NEXT_PUBLIC_API_URL production
npx vercel env add NEXT_PUBLIC_WS_URL production
npx vercel --prod --yes
```

Or Vercel Dashboard → Deployments → Redeploy.

---

## App URL

**https://tradepulses.vercel.app**
