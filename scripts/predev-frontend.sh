#!/usr/bin/env bash
set -euo pipefail

# Kill stale Vite dev servers on common ports
for PORT in 3000 3001; do
  if lsof -ti :"$PORT" >/dev/null 2>&1; then
    while IFS= read -r PID; do
      [ -n "$PID" ] && kill -9 "$PID" 2>/dev/null || true
    done < <(lsof -ti :"$PORT")
  fi
done

exit 0
