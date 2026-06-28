#!/usr/bin/env bash
# Trade-Pulse — rebuild and restart backend on GCP VM
# Requires: /opt/tradepulse/.env and cloned repo

set -euo pipefail

APP_DIR="/opt/tradepulse"
REPO_DIR="$APP_DIR/trade-pulse"
ENV_FILE="$APP_DIR/.env"
IMAGE="tradepulse-api"
CONTAINER="tradepulse-api"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Missing $ENV_FILE — create it first (see GOOGLE-CLOUD-SETUP.md)"
  exit 1
fi

if [ ! -d "$REPO_DIR/backend" ]; then
  echo "❌ Missing $REPO_DIR — run gcp-bootstrap.sh first"
  exit 1
fi

echo "==> Pulling latest code..."
cd "$REPO_DIR"
git pull --ff-only origin main || true

echo "==> Building Docker image..."
docker build -t "$IMAGE" "$REPO_DIR/backend"

echo "==> Restarting container..."
docker stop "$CONTAINER" 2>/dev/null || true
docker rm "$CONTAINER" 2>/dev/null || true

docker run -d \
  --name "$CONTAINER" \
  --restart unless-stopped \
  --env-file "$ENV_FILE" \
  -p 127.0.0.1:4000:4000 \
  "$IMAGE"

echo "==> Waiting for health..."
sleep 3
curl -sf "http://127.0.0.1:4000/api/health" && echo "" || {
  echo "⚠️  Health check failed — run: docker logs $CONTAINER"
  exit 1
}

echo "✅ Deployed. Public URL depends on Caddy/domain config."
