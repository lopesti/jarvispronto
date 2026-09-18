#!/usr/bin/env bash
# P2 item 34 — Backup do volume PostgreSQL
set -euo pipefail

STAMP=$(date +%Y%m%d_%H%M%S)
OUT_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$OUT_DIR"

CONTAINER="${PG_CONTAINER:-jarvis-postgres}"
DB="${POSTGRES_DB:-jarvispronto}"
USER="${POSTGRES_USER:-jarvis}"

echo "[backup] Dumping $DB from $CONTAINER..."
docker exec "$CONTAINER" pg_dump -U "$USER" -d "$DB" -Fc > "$OUT_DIR/jarvis_${STAMP}.dump"
echo "[backup] OK → $OUT_DIR/jarvis_${STAMP}.dump"

# Retém últimos 14 dumps
ls -1t "$OUT_DIR"/jarvis_*.dump 2>/dev/null | tail -n +15 | xargs -r rm -f
echo "[backup] Retenção aplicada (14 mais recentes)"
