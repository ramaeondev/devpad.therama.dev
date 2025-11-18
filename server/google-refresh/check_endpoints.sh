#!/usr/bin/env bash
# Simple smoke checks for google-refresh server
set -e
BASE=${1:-http://localhost:3001}

# Check auth endpoint redirects
echo "Checking /api/google/auth (expect 302)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/google/auth?user_id=test")
echo "Status: $STATUS"
if [ "$STATUS" != "302" ]; then
  echo "Unexpected status for auth endpoint: $STATUS"
  exit 2
fi

# Check refresh endpoint responds 400 without user_id
echo "Checking /api/google/refresh (expect 400 with missing user_id)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{}' "$BASE/api/google/refresh")
echo "Status: $STATUS"
if [ "$STATUS" != "400" ]; then
  echo "Unexpected status for refresh endpoint: $STATUS"
  exit 2
fi

echo "Smoke checks passed (auth redirect + refresh bad-request)."
