#!/usr/bin/env bash
# O-09: restaura dump gerado por backup-pg.sh
set -euo pipefail
DUMP="${1:-}"
if [[ -z "$DUMP" || ! -f "$DUMP" ]]; then
  echo "Uso: $0 <arquivo.dump|arquivo.sql.gz>"
  exit 1
fi
: "${DATABASE_URL:?DATABASE_URL obrigatorio}"
echo "Restaurando $DUMP ..."
if [[ "$DUMP" == *.sql.gz ]]; then
  gunzip -c "$DUMP" | psql "$DATABASE_URL"
elif [[ "$DUMP" == *.sql ]]; then
  psql "$DATABASE_URL" < "$DUMP"
else
  pg_restore --clean --if-exists -d "$DATABASE_URL" "$DUMP" || psql "$DATABASE_URL" < "$DUMP"
fi
echo "Restore concluído. Valide com: SELECT count(*) FROM companies;"
