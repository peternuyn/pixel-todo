#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# clear-db.sh — wipe ALL data out of the running Postgres database, but keep
# the table structure (the "schema") and the fixed pet catalog.
#
# WHY truncate instead of dropping tables?
#   Your Spring app runs with spring.jpa.hibernate.ddl-auto=validate, which means
#   on startup it CHECKS that the tables match your @Entity classes — it does NOT
#   create them. The tables themselves are created by db/init.sql when the
#   Postgres container first starts. So if we DROPPED the tables, the app would
#   refuse to boot. TRUNCATE empties the rows but leaves the tables in place,
#   so validation still passes. Best of both worlds.
#
# WHAT it does, step by step:
#   1. Loads your DB name/user from .env (same file docker-compose reads).
#   2. Runs one SQL statement inside the postgres container:
#        TRUNCATE <every table> RESTART IDENTITY CASCADE;
#      - TRUNCATE   = delete every row, fast (faster than DELETE).
#      - RESTART IDENTITY = reset any auto-increment counters back to the start.
#      - CASCADE    = also truncate tables that reference these via foreign keys,
#                     so we don't get "cannot truncate, still referenced" errors.
#   3. Re-seeds the pet catalog (db/seed.sql) so pets exist again.
#
# Usage:
#   ./scripts/clear-db.sh            # asks you to confirm first
#   ./scripts/clear-db.sh --yes      # skip the confirmation prompt
# ---------------------------------------------------------------------------

# 'set -euo pipefail' makes the script fail loudly instead of limping on:
#   -e  exit immediately if any command returns an error
#   -u  treat use of an unset variable as an error
#   -o pipefail  a pipeline fails if ANY command in it fails (not just the last)
set -euo pipefail

# Figure out where this script lives, so it works no matter where you run it from.
# (BASH_SOURCE[0] is this file's path; we cd to its parent's parent = project root.)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load .env if it exists, so POSTGRES_DB / POSTGRES_USER match docker-compose.
# 'set -a' marks every variable we define next as "exported" (visible to docker).
if [[ -f "$PROJECT_ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$PROJECT_ROOT/.env"
  set +a
fi

# Fall back to the same defaults docker-compose.yml uses (${VAR:-studyfarm}).
DB_NAME="${POSTGRES_DB:-studyfarm}"
DB_USER="${POSTGRES_USER:-studyfarm}"
# The postgres service name in docker-compose.yml. 'docker compose exec' looks it
# up by service name, so we don't have to hard-code the container name.
SERVICE="postgres"

# --- Safety confirmation -----------------------------------------------------
# This is destructive, so make the human say yes — unless they passed --yes.
if [[ "${1:-}" != "--yes" ]]; then
  echo "⚠️  This will DELETE ALL DATA in database '$DB_NAME' (users, rooms, sessions, chats, badges...)."
  echo "    The pet catalog will be re-seeded. Tables/structure are kept."
  read -r -p "Type 'yes' to continue: " reply
  if [[ "$reply" != "yes" ]]; then
    echo "Aborted. Nothing was changed."
    exit 1
  fi
fi

# Make sure the postgres container is actually up before we try to talk to it.
if ! docker compose -f "$PROJECT_ROOT/docker-compose.yml" ps --status running "$SERVICE" \
     | grep -q "$SERVICE"; then
  echo "❌ The '$SERVICE' container isn't running. Start it first with:"
  echo "     docker compose up -d $SERVICE"
  exit 1
fi

echo "🧹 Clearing data in '$DB_NAME'..."

# Build the TRUNCATE statement dynamically.
#   Instead of hand-listing every table (which gets stale when you add new ones),
#   we ask Postgres for all tables in the 'public' schema EXCEPT 'pets', join them
#   into one comma-separated list, and TRUNCATE them in a single statement.
#   We exclude 'pets' here and re-seed it explicitly below.
#
# How the SQL works:
#   - information_schema.tables lists every table the DB knows about.
#   - string_agg(...) glues the table names into "rooms, users, sessions, ..."
#   - format('TRUNCATE TABLE %s RESTART IDENTITY CASCADE', list) builds the command
#   - EXECUTE runs that built-up command (this is "dynamic SQL" inside a DO block).
docker compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T "$SERVICE" \
  psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" <<'SQL'
DO $$
DECLARE
  table_list text;
BEGIN
  SELECT string_agg(quote_ident(tablename), ', ')
    INTO table_list
    FROM pg_tables
   WHERE schemaname = 'public'
     AND tablename <> 'pets';     -- keep the catalog table's rows

  IF table_list IS NOT NULL THEN
    EXECUTE format('TRUNCATE TABLE %s RESTART IDENTITY CASCADE', table_list);
  END IF;
END $$;
SQL

# Re-seed the fixed pet catalog. ON CONFLICT DO NOTHING (inside seed.sql) makes
# this safe to run repeatedly — existing pets are left untouched.
echo "🌱 Re-seeding pet catalog..."
docker compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T "$SERVICE" \
  psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" \
  < "$PROJECT_ROOT/backend/src/main/resources/db/seed.sql"

echo "✅ Done. Database '$DB_NAME' is empty (schema + pets kept)."
