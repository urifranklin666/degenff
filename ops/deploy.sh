#!/usr/bin/env bash
# degenff redeploy: rebuild + bounce web. Run from /home/deadplug/Degeneracy.
# Bot is independent; it doesn't need a rebuild unless its source changed.
set -euo pipefail
cd "$(dirname "$0")/.."

# Source secrets so the build can read DATABASE_URL etc.
set -a; . /etc/degenff/env; set +a
export NODE_ENV=production

echo "→ Building…"
node node_modules/next/dist/bin/next build

echo "→ Restarting degenff-web…"
sudo systemctl restart degenff-web

echo "→ Health check…"
sleep 3
curl -s -o /dev/null -w 'HTTP=%{http_code} time=%{time_total}s\n' http://127.0.0.1:3000/
