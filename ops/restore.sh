#!/usr/bin/env bash
# degenff restore: the inverse of ops/backup.sh.
# Feeds a degenff-*.sql.zst (or plain .sql) dump back into DATABASE_URL,
# optionally restores the uploads tree, then bounces the services.
#
# Usage:
#   ops/restore.sh <dump.sql.zst|dump.sql> [--uploads <dir-or-tar>] [--yes]
#
# With no dump argument it uses /var/lib/degenff/backups/latest.sql.zst.
# DESTRUCTIVE: drops and recreates the public schema before loading.
set -euo pipefail

if [[ -r /etc/degenff/env ]]; then
  set -a; . /etc/degenff/env; set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[restore] DATABASE_URL not set; bailing." >&2
  exit 2
fi

DUMP="/var/lib/degenff/backups/latest.sql.zst"
UPLOADS_SRC=""
ASSUME_YES=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --uploads) UPLOADS_SRC="$2"; shift 2 ;;
    --yes)     ASSUME_YES=1; shift ;;
    -*)        echo "[restore] unknown flag: $1" >&2; exit 2 ;;
    *)         DUMP="$1"; shift ;;
  esac
done

if [[ ! -s "$DUMP" ]]; then
  echo "[restore] dump not found or empty: $DUMP" >&2
  exit 3
fi

# Sanity: a plain-format pg_dump starts with recognizable SQL, not garbage.
case "$DUMP" in
  *.zst) HEAD="$(zstdcat "$DUMP" | head -c 512)" ;;
  *)     HEAD="$(head -c 512 "$DUMP")" ;;
esac
if ! grep -q "PostgreSQL database dump" <<<"$HEAD"; then
  echo "[restore] $DUMP does not look like a pg_dump output; refusing." >&2
  exit 3
fi

echo "[restore] dump:    $DUMP"
echo "[restore] target:  ${DATABASE_URL%%\?*}"
[[ -n "$UPLOADS_SRC" ]] && echo "[restore] uploads: $UPLOADS_SRC"

if [[ "$ASSUME_YES" -ne 1 ]]; then
  read -r -p "[restore] this DROPS the current database contents. Type 'restore' to proceed: " CONFIRM
  [[ "$CONFIRM" == "restore" ]] || { echo "[restore] aborted."; exit 1; }
fi

# Stop everything that holds DB connections so the schema drop doesn't hang.
echo "[restore] stopping services…"
for SVC in degenff-web degenff-barker degenff-radio degenff-bot; do
  sudo systemctl stop "$SVC" 2>/dev/null || true
done

echo "[restore] dropping public schema…"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'

echo "[restore] loading dump…"
case "$DUMP" in
  *.zst) zstdcat "$DUMP" | psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q ;;
  *)     psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$DUMP" ;;
esac

TABLES=$(psql "$DATABASE_URL" -Atc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")
echo "[restore] loaded · ${TABLES} tables"
if [[ "$TABLES" -eq 0 ]]; then
  echo "[restore] zero tables after load — something is wrong." >&2
  exit 4
fi

if [[ -n "$UPLOADS_SRC" ]]; then
  DEST=/var/lib/degenff/uploads
  sudo mkdir -p "$DEST"
  echo "[restore] restoring uploads → $DEST"
  if [[ -d "$UPLOADS_SRC" ]]; then
    # Backups made on Windows lose permissions; rsync then re-normalize.
    sudo rsync -a "$UPLOADS_SRC"/ "$DEST"/
  else
    sudo tar -xf "$UPLOADS_SRC" -C "$DEST"
  fi
  sudo chown -R deadplug:deadplug "$DEST"
  sudo find "$DEST" -type d -exec chmod 0755 {} +
  sudo find "$DEST" -type f -exec chmod 0644 {} +
  echo "[restore] uploads · $(sudo find "$DEST" -type f | wc -l) files"
fi

echo "[restore] starting services…"
for SVC in degenff-web degenff-barker degenff-radio; do
  sudo systemctl start "$SVC" 2>/dev/null || true
done

echo "[restore] health check…"
sleep 3
curl -s -o /dev/null -w 'HTTP=%{http_code} time=%{time_total}s\n' http://127.0.0.1:3000/ \
  || echo "[restore] web not answering yet — check: journalctl -u degenff-web -n 50"

echo "[restore] done."
