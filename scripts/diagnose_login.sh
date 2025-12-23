#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL=${API_BASE_URL:-http://localhost:8080}
IAM_BASE_URL=${IAM_BASE_URL:-http://localhost:8090}
FRONT_BASE_URL=${FRONT_BASE_URL:-http://localhost:8081}
ADMIN_EMAIL=${ADMIN_EMAIL:-${SUPERADMIN_EMAIL:-"superadmin@example.com"}}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-${SUPERADMIN_PASSWORD:-"ChangeMe_Admin!123"}}

section() {
  printf '\n=== %s ===\n' "$1"
}

section "Gateway health (8080)"
curl -i "${API_BASE_URL}/actuator/health"

section "IAM health (8090)"
curl -i "${IAM_BASE_URL}/actuator/health"

section "Gateway signin (POST /api/v1/auth/signin)"
signin_output=$(curl -s -D - -H "Content-Type: application/json" -X POST "${API_BASE_URL}/api/v1/auth/signin" -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}")
# Redact JWT for logs
printf '%s\n' "$signin_output" | sed -E 's/("token"\s*:\s*")[^"]*(")/\1<redacted>\2/'

section "CORS preflight (OPTIONS)"
curl -i -X OPTIONS "${API_BASE_URL}/api/v1/auth/signin" \
  -H "Origin: ${FRONT_BASE_URL}" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization"

section "Frontend login (8081/login.html)"
curl -i "${FRONT_BASE_URL}/login.html"
