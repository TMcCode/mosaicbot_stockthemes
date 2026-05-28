#!/usr/bin/env bash
# Stop stray Next dev servers and remove a corrupted .next cache.
# Use: npm run dev:clean   (or run this, then npm run dev)
set -eo pipefail
cd "$(dirname "$0")/.."

echo "Stopping dev servers on ports 3000-3003..."
for port in 3000 3001 3002 3003; do
  pids="$(lsof -nP -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [ -n "${pids}" ]; then
    echo "  port ${port}: killing ${pids}"
    while IFS= read -r pid; do
      [ -n "${pid}" ] && kill -9 "${pid}" 2>/dev/null || true
    done <<<"${pids}"
  fi
done

if [ -e .next ]; then
  aside=".next.trash.$(date +%s).$$"
  echo "Moving .next aside -> ${aside} ..."
  if mv .next "${aside}" 2>/dev/null; then
    rm -rf "${aside}" 2>/dev/null || true
    echo "Removed .next"
  else
    echo "mv failed; run: rm -rf .next"
    rm -rf .next 2>/dev/null || true
    echo "Removed .next"
  fi
else
  echo "No .next to remove"
fi

echo "Start ONE dev server only: npm run dev:clean:webpack"
echo "Do not run 'rm -rf .next' while dev is running — that causes routes-manifest ENOENT 500s."
echo "After a clean reset: close old localhost tabs, then hard-refresh (Cmd+Shift+R)."
node_major="$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)"
if [ "${node_major}" -ge 24 ] 2>/dev/null; then
  echo "Note: Node $(node -v) is outside package.json engines (<24). Prefer Node 20 or 22 LTS for next dev."
fi
