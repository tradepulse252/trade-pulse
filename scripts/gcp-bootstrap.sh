#!/usr/bin/env bash
# Trade-Pulse — Google Cloud VM bootstrap (Ubuntu 22.04+)
# Run as root or with sudo: bash scripts/gcp-bootstrap.sh

set -euo pipefail

APP_DIR="/opt/tradepulse"
REPO_URL="${REPO_URL:-https://github.com/tradepulse252/trade-pulse.git}"

echo "==> Updating packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq

echo "==> Installing dependencies..."
apt-get install -y -qq git curl ca-certificates gnupg

echo "==> Enabling swap (helps e2-micro 1 GB RAM)..."
if ! swapon --show | grep -q '/swapfile'; then
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> Installing Docker..."
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable docker
  systemctl start docker
fi

echo "==> Installing Caddy..."
if ! command -v caddy >/dev/null 2>&1; then
  apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq
  apt-get install -y -qq caddy
fi

mkdir -p "$APP_DIR"
if [ ! -d "$APP_DIR/trade-pulse/.git" ]; then
  echo "==> Cloning Trade-Pulse repo..."
  git clone "$REPO_URL" "$APP_DIR/trade-pulse"
else
  echo "==> Repo already cloned at $APP_DIR/trade-pulse"
fi

if [ ! -f /etc/caddy/Caddyfile ] || ! grep -q tradepulse /etc/caddy/Caddyfile 2>/dev/null; then
  cat > /etc/caddy/Caddyfile << 'EOF'
# Replace with your domain before going to production:
# api.yourdomain.com {
#     reverse_proxy 127.0.0.1:4000
# }

:80 {
    reverse_proxy 127.0.0.1:4000
}
EOF
  systemctl enable caddy
  systemctl reload caddy || systemctl restart caddy
fi

cat << EOF

✅ Bootstrap complete.

Next steps:
1. Create $APP_DIR/.env (see GOOGLE-CLOUD-SETUP.md)
2. Run: sudo bash $APP_DIR/trade-pulse/scripts/gcp-deploy.sh
3. Test: curl http://127.0.0.1:4000/api/health
4. Point a domain to this VM and update /etc/caddy/Caddyfile for HTTPS

EOF
