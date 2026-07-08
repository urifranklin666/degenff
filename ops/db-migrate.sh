#!/usr/bin/env bash
# degenff db migrate: source /etc/degenff/env then run drizzle-kit migrate.
# Run from anywhere; the script cds into the repo root itself.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -r /etc/degenff/env ]]; then
  set -a; . /etc/degenff/env; set +a
else
  echo "[db-migrate] /etc/degenff/env not readable; bailing." >&2
  exit 2
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[db-migrate] DATABASE_URL not set after sourcing env; bailing." >&2
  exit 3
fi

exec npm run db:migrate
