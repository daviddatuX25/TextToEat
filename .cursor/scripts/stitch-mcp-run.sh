#!/usr/bin/env bash
# Launcher that loads nvm (so node is on PATH) then runs the Stitch MCP wrapper.
# Use this when Cursor runs in an environment where node isn't in PATH (e.g. WSL without .bashrc).
set -e
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
fi
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec node "$SCRIPT_DIR/stitch-mcp-wrapper.js"
