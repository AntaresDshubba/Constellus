#!/bin/bash
# SessionStart hook for Astroverse: Constellation Nexus.
# Installs npm dependencies so the typecheck/build/ephemeris gates and the
# Vite dev server work immediately in a fresh Claude Code on the web session.
set -euo pipefail

# Only run in Claude Code on the web (remote) environments; local sessions
# already have whatever the developer installed.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Idempotent and cache-friendly: npm install is safe to re-run and reuses the
# container's cached node_modules layer (preferred over `npm ci`, which wipes it).
npm install

echo "session-start: dependencies installed."
