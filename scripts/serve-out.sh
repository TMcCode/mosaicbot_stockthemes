#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

port=3000
url="http://localhost:${port}"
pids="$(lsof -nP -tiTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "${pids}" ]; then
  echo "Stopping the existing server on port ${port}..."
  while IFS= read -r pid; do
    [ -n "${pid}" ] && kill -9 "${pid}" 2>/dev/null || true
  done <<<"${pids}"
fi

echo "Production preview: ${url}"
if command -v open >/dev/null 2>&1; then
  (sleep 1.2 && open "${url}") &
fi

exec npx --yes serve out -l "${port}" --no-clipboard
