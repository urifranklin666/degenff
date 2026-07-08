#!/usr/bin/env bash
# degenff backup: pg_dump → zstd → /var/lib/degenff/backups, keep 14 days.
# Run by ops/degenff-backup.timer (daily 4am UTC). Idempotent.
set -euo pipefail

# Load DB credentials from the canonical env file
if [[ -r /etc/degenff/env ]]; then
  set -a; . /etc/degenff/env; set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[backup] DATABASE_URL not set; bailing." >&2
  exit 2
fi

DEST_DIR="/var/lib/degenff/backups"
mkdir -p "$DEST_DIR"

STAMP="$(date -u +%Y-%m-%d-%H%M)"
OUT="$DEST_DIR/degenff-${STAMP}.sql.zst"

echo "[backup] dumping → ${OUT}"

# --format=plain so the dump is grep-able; zstd handles compression.
# --no-owner so the backup restores cleanly under a different role.
pg_dump --no-owner --format=plain "$DATABASE_URL" \
  | zstd -q -19 -o "$OUT"

# Verify the dump isn't empty/corrupt
if [[ ! -s "$OUT" ]]; then
  echo "[backup] dump file is empty; aborting." >&2
  exit 3
fi

# Symlink "latest" for convenience
ln -sf "$(basename "$OUT")" "$DEST_DIR/latest.sql.zst"

# Retain last 14 daily backups
find "$DEST_DIR" -maxdepth 1 -name 'degenff-*.sql.zst' -type f -mtime +14 -print -delete || true

SIZE=$(stat -c '%s' "$OUT")
echo "[backup] ok · $(numfmt --to=iec --suffix=B "$SIZE") · $OUT"
