#!/usr/bin/env bash
# Meraki Portal — pull latest code and redeploy on the VPS.
# Usage:  cd /var/www/meraki && ./deploy/deploy.sh
set -euo pipefail

ROOT=/var/www/meraki
cd "$ROOT"

echo "==> Pulling latest code"
git pull --ff-only

echo "==> Backend deps"
"$ROOT/.venv/bin/pip" install -q -r backend/requirements.txt

echo "==> Building frontend"
cd "$ROOT/frontend"
npm ci
npm run build
cd "$ROOT"

echo "==> Restarting services"
sudo systemctl restart meraki-api
sudo systemctl reload nginx

echo "✅ Deployed. API health:"
curl -fsS http://127.0.0.1:8000/api/health && echo
