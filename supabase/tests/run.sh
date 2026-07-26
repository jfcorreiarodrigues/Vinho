#!/usr/bin/env bash
#
# Corre as migrações e os testes de RLS contra um Postgres local efémero.
#
#   ./supabase/tests/run.sh
#
# Requer o Postgres 16 instalado (binários em /usr/lib/postgresql/16/bin).
# Não toca em nenhum projecto Supabase remoto.

set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
PGPORT="${PGPORT:-5433}"
BASE="${BASE:-/tmp/vinhavibe-pgtest}"
export PATH="$PGBIN:$PATH"

# O Postgres recusa arrancar como root.
if [[ "$(id -u)" -eq 0 ]]; then
  id pgtest &>/dev/null || useradd -m pgtest
  DONO="pgtest"
  BASE="/home/pgtest/vinhavibe-pgtest"
else
  DONO="$(id -un)"
fi

correr_como() { if [[ "$DONO" != "$(id -un)" ]]; then su "$DONO" -c "PATH=$PGBIN:\$PATH $1"; else bash -c "$1"; fi; }

echo "▶ a preparar cluster em $BASE"
correr_como "pg_ctl -D $BASE/data stop -m immediate" &>/dev/null || true
rm -rf "$BASE"; mkdir -p "$BASE/data" "$BASE/run"
[[ "$DONO" != "$(id -un)" ]] && chown -R "$DONO" "$BASE"

correr_como "initdb -D $BASE/data -U postgres --auth=trust" >/dev/null
correr_como "pg_ctl -D $BASE/data -o '-k $BASE/run -p $PGPORT -c listen_addresses=' -l $BASE/pg.log start" >/dev/null

limpar() { correr_como "pg_ctl -D $BASE/data stop -m immediate" &>/dev/null || true; }
trap limpar EXIT

PSQL="psql -h $BASE/run -p $PGPORT -U postgres -v ON_ERROR_STOP=1 -q"

$PSQL -c "CREATE DATABASE vinhavibe;" >/dev/null
$PSQL -d vinhavibe -f "$RAIZ/supabase/tests/00_supabase_shim.sql"

echo "▶ a aplicar migrações"
for f in "$RAIZ"/supabase/migrations/*.sql; do
  echo "   $(basename "$f")"
  $PSQL -d vinhavibe -f "$f"
done

echo "▶ testes de RLS"
$PSQL -d vinhavibe -f "$RAIZ/supabase/tests/rls_test.sql" 2>&1 \
  | sed 's/^psql:.*NOTICE:  /   /'

echo "✅ tudo passou"
