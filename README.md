# Trade-Pulse

**Real-Time Opportunity Scanner** for Binance Futures

Trade-Pulse is an intelligent market intelligence engine that automatically identifies, scores, ranks, and monitors the best Long and Short trading opportunities on Binance Futures by analyzing Open Interest growth, Volume growth, Funding Rates, and Price Momentum.

## Core Philosophy

> **Increasing Open Interest + Increasing Volume = New Capital Entering Market**

The system aggressively searches for and highlights this behavior across all active USDT perpetual futures pairs.

---

## Architecture

```
TradePulse/
├── backend/          # Node.js + Express + TypeScript + Firestore
├── frontend/         # Next.js 15 (App Router) + Tailwind
├── .northflank/      # Northflank deploy template
├── northflank.yaml   # Northflank service reference
├── mobile/           # Flutter (Android/iOS)
├── docker-compose.yml
└── .env.example
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Data Source | Binance Futures REST API + WebSocket Streams |
| Backend | Node.js, Express, TypeScript, Firebase Admin |
| Database | Firestore |
| Cache | Redis 7 (optional — Upstash) |
| Frontend | Next.js 15, Tailwind CSS, TradingView Lightweight Charts |
| Mobile | Flutter 3.x, Provider, Firebase Messaging |
| Infrastructure | Docker, Northflank, Vercel |

---

## Signal Classification

| Signal | Criteria |
|--------|----------|
| 🔥 **Strong Long** | Significant OI↑ + Volume↑ + Negative Funding + Price stable/up |
| 🟢 **Weak Long** | OI↑ + Volume↑ + Slightly positive Funding |
| 🔴 **Strong Short** | Significant OI↑ + Volume↑ + Strongly positive Funding + Price weakening |

### Opportunity Score (0–100)

| Component | Weight |
|-----------|--------|
| Open Interest Growth | 40% |
| Volume Growth | 30% |
| Funding Rate Analysis | 20% |
| Price Momentum | 10% |

### Lookback Windows

`5m` · `15m` · `30m` · `1h` · `2h` · `4h` · `24h` · `7d`

---

## Quick Start (Development)

See **[DEPLOY-FREE.md](DEPLOY-FREE.md)** for production deployment (Vercel + Northflank + Firestore).

### Local Development

### Prerequisites

- Node.js 20+
- Firebase project with Firestore (for auth, journal, watchlist)
- Redis 7 (optional)
- Docker & Docker Compose (optional)

### 1. Clone & Configure

```bash
cp backend/.env.example backend/.env
# Edit backend/.env — set JWT_SECRET, FIREBASE_*, etc.
```

### 2. Start Infrastructure

```bash
# Option A: Docker (recommended)
docker compose up postgres redis -d

# Option B: Local services
# Ensure PostgreSQL and Redis are running
```

### 3. Install & Setup Backend

```bash
npm install
cd backend
cp .env.example .env        # or use root .env
npm run db:migrate          # Apply migrations
npm run db:seed             # Create admin user
npm run dev                 # Start on :4000
```

Default admin credentials (change in production):
- Email: `admin@tradepulse.io`
- Password: `Admin123!ChangeMe`

### 4. Start Frontend

```bash
cd frontend
npm install
npm run dev          # Start on :3000
```

### 5. Mobile (Optional)

```bash
cd mobile
flutter pub get
flutter run --dart-define=API_URL=http://10.0.2.2:4000 --dart-define=WS_URL=ws://10.0.2.2:4000
```

---

## Docker Production Deployment

```bash
# Standard deployment
docker compose up -d --build

# With Nginx reverse proxy (production profile)
docker compose --profile production up -d --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4000 |
| WebSocket | ws://localhost:4000/ws |
| Nginx (production) | http://localhost:80 |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | System health check |
| GET | `/api/opportunities` | Ranked opportunities (with filters) |
| GET | `/api/symbols` | Active trading symbols |
| GET | `/api/symbols/:symbol` | Coin detail + growth matrix |
| GET | `/api/symbols/:symbol/charts` | Chart time-series data |
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | User login |
| GET | `/api/watchlist` | User watchlist (auth) |
| POST | `/api/watchlist` | Add to watchlist (auth) |
| GET | `/api/alerts` | User alerts (auth) |
| GET | `/api/admin/dashboard` | Admin metrics (admin) |
| WS | `/ws` | Real-time opportunity stream |

### Filter Parameters

```
?signalType=STRONG_LONG
&minScore=70
&minOi=500000
&minVolume=1000000
&fundingRateMin=-0.01
&fundingRateMax=0.01
&symbols=BTCUSDT,ETHUSDT
&limit=50
```

---

## Production Deployment Checklist

### Security

- [ ] Change `JWT_SECRET` to a cryptographically random 64+ char string
- [ ] Change `POSTGRES_PASSWORD` and all default credentials
- [ ] Set `CORS_ORIGIN` to your production domain
- [ ] Enable HTTPS via reverse proxy (Nginx/Caddy/Traefik)
- [ ] Configure firewall rules (only expose 80/443)
- [ ] Never commit `.env` files

### Database

- [ ] Deploy Firestore rules: `npm run firebase:deploy`
- [ ] Seed admin user: `npm run db:seed`
- [ ] Set Firebase credentials on Northflank

### Scaling

- [ ] Deploy backend on Northflank (see DEPLOY-FREE.md)
- [ ] Use Redis pub/sub for cross-instance WebSocket broadcasting
- [ ] Set up CDN for frontend static assets (Vercel)
- [ ] Configure horizontal pod autoscaling (K8s) or Docker Swarm
- [ ] Monitor Binance API rate limits (1200 req/min)

### Monitoring

- [ ] Set up health check alerts on `/api/health`
- [ ] Monitor WebSocket connection count and staleness
- [ ] Track error logs via `/api/admin/errors`
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Configure log aggregation (ELK, Datadog, Grafana)

### Mobile Push Notifications

- [ ] Create Firebase project
- [ ] Set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- [ ] Configure APNs (iOS) and FCM (Android) credentials
- [ ] Test alert delivery end-to-end

---

## Environment Variables

See [`.env.example`](.env.example) for the complete list.

Key variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `FIREBASE_PROJECT_ID` | Firebase / Firestore project | — |
| `REDIS_URL` | Redis connection string | optional |
| `JWT_SECRET` | Auth token signing key | — |
| `NEXT_PUBLIC_API_URL` | Northflank backend URL | `http://localhost:4000` |
| `MIN_VOLUME_USDT` | Liquidity filter threshold | `1000000` |
| `MIN_OPEN_INTEREST_USDT` | OI filter threshold | `500000` |
| `SCORING_INTERVAL_MS` | Scoring engine cycle | `5000` |

---

## License

Proprietary — All rights reserved.
