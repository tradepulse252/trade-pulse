# Vercel — tradepulses.vercel.app setup

The domain **https://tradepulses.vercel.app** is on a **different Vercel account** than `cmc252/tradepulse`.

Configure the project that owns **tradepulses.vercel.app**:

---

## 1. Open Vercel project

1. Log in to the Vercel account that has **tradepulses.vercel.app**
2. Open that project → **Settings → Git**
3. Connect: **https://github.com/tradepulse252/trade-pulse**
4. **Root Directory:** `frontend`
5. Production branch: **`main`**

---

## 2. Environment variables (Production)

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://tradepulse-api.onrender.com` |
| `NEXT_PUBLIC_WS_URL` | `wss://tradepulse-api.onrender.com` |

Save → **Redeploy**.

---

## 3. Verify

- https://tradepulses.vercel.app
- https://tradepulses.vercel.app/journal

---

## CLI (if logged into that account)

```powershell
cd frontend
npx vercel link
npx vercel env add NEXT_PUBLIC_API_URL production
npx vercel env add NEXT_PUBLIC_WS_URL production
npx vercel --prod
```
