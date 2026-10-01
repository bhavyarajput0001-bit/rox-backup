#!/usr/bin/env bash
# Rox deploy/update script — builds the Docker image and (re)starts the container.
# Usage: ./deploy.sh          # build + start/restart
#        ./deploy.sh --pull   # git pull (update source) then build + restart
set -euo pipefail
cd "$(dirname "$0")"

if [[ "${1:-}" == "--pull" ]]; then
  echo "==> Pulling latest source..."
  git pull --ff-only
fi

echo "==> Building image (rox-orb-ui:latest)..."
docker compose build

echo "==> (Re)starting container..."
docker compose up -d

echo "==> Done. Rox is live at:"
echo "    http://localhost:3000"
echo "    (LAN: http://$(ipconfig getifaddr en0 2>/dev/null || echo 'your-mac-ip'):3000)"