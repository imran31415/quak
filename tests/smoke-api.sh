#!/usr/bin/env bash
# Smoke-tests the main HTTP routes. Run after a deploy or against local dev.
#   tests/smoke-api.sh                       # default: http://localhost:3001
#   tests/smoke-api.sh https://quak-dev.scalebase.io
set -uo pipefail

BASE="${1:-http://localhost:3001}"
JAR="$(mktemp -t quak-smoke-jar.XXXXXX)"
trap 'rm -f "$JAR"' EXIT
# All requests share the same anonymous user via a cookie jar so owner-scoped
# routes (post-multi-user-migration) can find the data they just wrote.
CURL=(curl -s --max-time 15 -b "$JAR" -c "$JAR" -H 'Content-Type: application/json')

pass=0; fail=0
check() {
  local label="$1" expected="$2" actual="$3"
  if [[ "$actual" == *"$expected"* ]]; then
    echo "  ✓ $label"; pass=$((pass+1))
  else
    echo "  ✗ $label  (expected to contain: $expected; got: $(echo "$actual" | head -c 200))"; fail=$((fail+1))
  fi
}

echo "BASE = $BASE"
echo

echo "== /api/health"
check "200 + status:ok" '"status":"ok"' "$("${CURL[@]}" "$BASE/api/health")"

echo "== GET /api/me (anonymous user lazily created)"
check "user id" '"id":"' "$("${CURL[@]}" "$BASE/api/me")"

echo "== POST /api/sheets (user-facing create)"
CREATE_BODY='{"name":"smoke-'"$(date +%s)"'","columns":[{"name":"Item","cellType":"text"},{"name":"Qty","cellType":"number"}]}'
CREATE_RESP=$("${CURL[@]}" -X POST "$BASE/api/sheets" -d "$CREATE_BODY")
check "returns id" '"id":"' "$CREATE_RESP"
# First UUID-shaped id in the response is the sheet id; greedy regex would
# pick the last one (which is a column id in some responses).
SHEET_ID=$(echo "$CREATE_RESP" | grep -oE '"id":"[a-f0-9-]{36}"' | head -1 | sed 's/"id":"\(.*\)"/\1/')
echo "  sheet_id=$SHEET_ID"

echo "== POST /api/sheets/:id/rows (single row add)"
ROW_BODY='{"Item":"Apple","Qty":3}'
check "201 success" '"success":true' "$("${CURL[@]}" -X POST "$BASE/api/sheets/$SHEET_ID/rows" -d "$ROW_BODY")"

echo "== GET /api/sheets/:id (read with __order)"
GET_RESP=$("${CURL[@]}" "$BASE/api/sheets/$SHEET_ID")
check "200 with rows" '"Apple"' "$GET_RESP"

echo "== POST /api/sheets/:id/columns (add column)"
COL_BODY='{"name":"Done","cellType":"checkbox"}'
check "added" '"id":' "$("${CURL[@]}" -X POST "$BASE/api/sheets/$SHEET_ID/columns" -d "$COL_BODY")"

echo "== GET /api/sheets (list)"
check "lists smoke sheet" "$SHEET_ID" "$("${CURL[@]}" "$BASE/api/sheets")"

echo "== GET /api/sheets/:id/schema"
check "schema returns columns" '"columns":' "$("${CURL[@]}" "$BASE/api/sheets/$SHEET_ID/schema")"

echo "== POST /api/query (read-only SQL)"
QUERY_BODY='{"sql":"SELECT 1+1 AS two"}'
check "select 1+1" '"two":2' "$("${CURL[@]}" -X POST "$BASE/api/query" -d "$QUERY_BODY")"

echo "== POST /api/import (CSV upload)"
TMPCSV=$(mktemp /tmp/smoke.XXXXXX.csv)
printf 'name,age\nAlice,30\nBob,25\n' > "$TMPCSV"
IMPORT_RESP=$(curl -s --max-time 15 -b "$JAR" -c "$JAR" -X POST -F "file=@$TMPCSV" "$BASE/api/import")
check "imported sheet" '"rowCount":2' "$IMPORT_RESP"
IMPORT_ID=$(echo "$IMPORT_RESP" | grep -oE '"id":"[a-f0-9-]{36}"' | head -1 | sed 's/"id":"\(.*\)"/\1/')
rm -f "$TMPCSV"

echo "== DELETE /api/sheets/:id (cleanup)"
check "deleted smoke" '"success":true' "$("${CURL[@]}" -X DELETE "$BASE/api/sheets/$SHEET_ID")"
check "deleted import" '"success":true' "$("${CURL[@]}" -X DELETE "$BASE/api/sheets/$IMPORT_ID")"

echo
echo "== summary: $pass passed, $fail failed"
[[ $fail -eq 0 ]] || exit 1
