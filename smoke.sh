#!/usr/bin/env bash
set -euo pipefail

BASE_URL="https://todo.w3ctech.dev"
API_PREFIX="/api/v1"
EMAIL="smoke-$(date +%s)@example.com"
PASSWORD="Password123!"

echo "== 1) Health =="
curl -sS -i "$BASE_URL$API_PREFIX/health"
echo -e "\n"

echo "== 2) Ready =="
curl -sS -i "$BASE_URL$API_PREFIX/ready"
echo -e "\n"

echo "== 3) Register =="
REGISTER_JSON=$(curl -sS "$BASE_URL$API_PREFIX/auth/register" \
  -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
echo "$REGISTER_JSON"

ACCESS_TOKEN=$(echo "$REGISTER_JSON" | jq -r '.accessToken')
REFRESH_TOKEN=$(echo "$REGISTER_JSON" | jq -r '.refreshToken')
echo -e "\n"

echo "== 4) Login =="
LOGIN_JSON=$(curl -sS "$BASE_URL$API_PREFIX/auth/login" \
  -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
echo "$LOGIN_JSON"

ACCESS_TOKEN=$(echo "$LOGIN_JSON" | jq -r '.accessToken')
REFRESH_TOKEN=$(echo "$LOGIN_JSON" | jq -r '.refreshToken')
echo -e "\n"

echo "== 5) /auth/me =="
curl -sS "$BASE_URL$API_PREFIX/auth/me" \
  -H "authorization: Bearer $ACCESS_TOKEN" | jq
echo -e "\n"

echo "== 6) Create todo =="
CREATE_JSON=$(curl -sS "$BASE_URL$API_PREFIX/todos" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $ACCESS_TOKEN" \
  -d '{"title":"smoke task","completed":false}')
echo "$CREATE_JSON" | jq
TODO_ID=$(echo "$CREATE_JSON" | jq -r '.id')
echo -e "\n"

echo "== 7) List todos =="
curl -sS "$BASE_URL$API_PREFIX/todos?limit=10&offset=0" \
  -H "authorization: Bearer $ACCESS_TOKEN" | jq
echo -e "\n"

echo "== 8) Patch todo =="
curl -sS "$BASE_URL$API_PREFIX/todos/$TODO_ID" \
  -X PATCH \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $ACCESS_TOKEN" \
  -d '{"completed":true}' | jq
echo -e "\n"

echo "== 9) Refresh token =="
REFRESH_JSON=$(curl -sS "$BASE_URL$API_PREFIX/auth/refresh" \
  -H 'content-type: application/json' \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")
echo "$REFRESH_JSON" | jq
NEW_ACCESS_TOKEN=$(echo "$REFRESH_JSON" | jq -r '.accessToken')
NEW_REFRESH_TOKEN=$(echo "$REFRESH_JSON" | jq -r '.refreshToken')
echo -e "\n"

echo "== 10) Logout (revoke refresh) =="
curl -sS -i "$BASE_URL$API_PREFIX/auth/logout" \
  -X POST \
  -H 'content-type: application/json' \
  -d "{\"refreshToken\":\"$NEW_REFRESH_TOKEN\"}"
echo -e "\n"

echo "== 11) Refresh after logout (should fail 401) =="
curl -sS -i "$BASE_URL$API_PREFIX/auth/refresh" \
  -X POST \
  -H 'content-type: application/json' \
  -d "{\"refreshToken\":\"$NEW_REFRESH_TOKEN\"}"
echo -e "\n"

echo "== 12) Delete todo =="
curl -sS -i "$BASE_URL$API_PREFIX/todos/$TODO_ID" \
  -X DELETE \
  -H "authorization: Bearer $NEW_ACCESS_TOKEN"
echo -e "\n"

echo "Smoke test done."
