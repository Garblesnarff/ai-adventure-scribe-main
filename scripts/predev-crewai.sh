#!/usr/bin/env bash
set -euo pipefail

# Kill any process listening on port 8000 (stale uvicorn)
if lsof -ti :8000 >/dev/null 2>&1; then
  while IFS= read -r PID; do
    [ -n "$PID" ] && kill -9 "$PID" 2>/dev/null || true
  done < <(lsof -ti :8000)
fi

# Bootstrap virtualenv and required Python packages if missing
if [ ! -x "crewai-service/.venv/bin/uvicorn" ]; then
  python3 -m venv crewai-service/.venv
  crewai-service/.venv/bin/pip install -U pip
  crewai-service/.venv/bin/pip install "uvicorn[standard]" fastapi httpx pydantic
fi

exit 0
