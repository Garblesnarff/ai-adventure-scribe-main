#!/usr/bin/env bash
set -euo pipefail

# Kill any process listening on port 8888 (stale Node server)
if lsof -ti :8888 >/dev/null 2>&1; then
  while IFS= read -r PID; do
    [ -n "$PID" ] && kill -9 "$PID" 2>/dev/null || true
  done < <(lsof -ti :8888)
fi

exit 0
