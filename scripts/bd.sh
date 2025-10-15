#!/usr/bin/env bash
set -euo pipefail

# Resolve repo root (scripts/..)
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Ensure $HOME/go/bin is on PATH for non-interactive shells
export PATH="$HOME/go/bin:$PATH"

# Allow override via BD_BIN env; otherwise discover common locations
BD_BIN="${BD_BIN:-}"
if [[ -z "$BD_BIN" ]]; then
  if [[ -x "/Users/rob/go/bin/bd" ]]; then
    BD_BIN="/Users/rob/go/bin/bd"
  elif command -v bd >/dev/null 2>&1; then
    BD_BIN="$(command -v bd)"
  elif [[ -x "$HOME/go/bin/bd" ]]; then
    BD_BIN="$HOME/go/bin/bd"
  else
    echo "Error: 'bd' binary not found. Install Beads (bd) or set BD_BIN to its path." >&2
    exit 127
  fi
fi

cd "$REPO_DIR"

# Auto-init if missing project DB
if [[ ! -d "$REPO_DIR/.beads" ]]; then
  "$BD_BIN" init || true
fi

exec "$BD_BIN" "$@"
