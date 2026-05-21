#!/usr/bin/env bash
# Stop stray Next dev servers and remove a corrupted .next cache.
# Use: npm run dev:clean   (or run this, then npm run dev)
set -euo pipefail
cd "$(dirname "$0")/.."

for port in 3000 3001 3002 3003; do
  if lsof -ti:"$port" >/dev/null 2>&1; then
    echo "Killing process on port $port"
    lsof -ti:"$port" | xargs kill -9 2>/dev/null || true
  fi
done

pkill -9 -f "next dev" 2>/dev/null || true
pkill -9 -f "node.*mosaicbot_stockthemes.*next" 2>/dev/null || true

rm -rf .next
echo "Removed .next"
echo "Start: npm run dev   (or npm run dev:webpack if Turbopack HMR errors persist)"
echo "After a clean reset: close old localhost tabs, then hard-refresh (Cmd+Shift+R)."
node_major="$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)"
if [ "${node_major}" -ge 24 ] 2>/dev/null; then
  echo "Note: Node $(node -v) is outside package.json engines (<24). Prefer Node 20 or 22 LTS for next dev."
fi
