#!/usr/bin/env bash
# Porto Shop — get ready for the workshop with one command.
#
#   ./start.sh            install, check the machine, start the shop (part 1)
#   ./start.sh --check    the same without starting the shop — run it at home the day before
#
# Without a clone yet:
#   curl -fsSL https://raw.githubusercontent.com/ataztech910/workshop-ai-observability/master/start.sh | bash
# clones the shop into ./workshop-ai-observability first. On Windows, run it from Git Bash — or use the npm commands
# from the README.
set -euo pipefail

REPO="https://github.com/ataztech910/workshop-ai-observability.git"
DIR="workshop-ai-observability"
CHECK_ONLY=false
[ "${1:-}" = "--check" ] && CHECK_ONLY=true

say() { printf '\n\033[1;33m▸ %s\033[0m\n' "$1"; }
fail() { printf '\n\033[1;31m✗ %s\033[0m\n' "$1" >&2; exit 1; }

say "Checking git, Node.js and npm"
command -v git >/dev/null || fail "git is missing — install it from https://git-scm.com"
command -v node >/dev/null || fail "Node.js is missing — install the current LTS from https://nodejs.org (22.18 or newer)"
command -v npm >/dev/null || fail "npm is missing — it comes with Node.js: https://nodejs.org"
node -e 'const [a,b]=process.versions.node.split(".").map(Number); process.exit(a>22||(a===22&&b>=18)?0:1)' \
  || fail "Node.js $(node -v) is too old — 22.18 or newer is needed: https://nodejs.org"
echo "git $(git --version | cut -d' ' -f3), Node.js $(node -v), npm $(npm -v)"

# In the shop already (./start.sh), or somewhere else (curl … | bash): then clone it, or use the clone made earlier.
if [ -f package.json ] && grep -q '"name": "workshop-ai-observability"' package.json; then
  :
elif [ -d "$DIR/.git" ]; then
  say "Using the clone in ./$DIR"
  cd "$DIR"
else
  say "Cloning the shop into ./$DIR"
  git clone "$REPO" "$DIR"
  cd "$DIR"
fi

say "Installing (npm install)"
npm install --no-audit --no-fund

say "Checking the machine (npm run doctor)"
npm run doctor || fail "fix what doctor says above, then run ./start.sh again"

if $CHECK_ONLY; then
  say "All set. On the day: cd $(pwd) && ./start.sh"
  exit 0
fi

say "Starting the shop — open the address Next.js prints below (usually http://localhost:3000). Ctrl+C stops it."
exec npm run dev
