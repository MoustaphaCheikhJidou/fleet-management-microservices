#!/bin/bash

EMAIL=${TEST_EMAIL:-"test+$(date +%s)@example.com"}
PASSWORD=${TEST_PASSWORD:-"TestPassword123"}
DRIVER_EMAIL=${TEST_DRIVER_EMAIL:-"driver+$(date +%s)@example.com"}
DRIVER_PASSWORD=${TEST_DRIVER_PASSWORD:-"DriverPassword123"}
ADMIN_EMAIL=${ADMIN_EMAIL:-${SUPERADMIN_EMAIL:-"superadmin@example.com"}}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-${SUPERADMIN_PASSWORD:-"ChangeMe_Admin!123"}}

echo "Using carrier credentials -> email: ${EMAIL}, password: ${PASSWORD}"
echo "Using driver credentials -> email: ${DRIVER_EMAIL}, password: ${DRIVER_PASSWORD}"
echo "Using admin credentials -> email: ${ADMIN_EMAIL}"

echo "=== HEALTH CHECK ==="
curl -sS http://localhost:8090/actuator/health | python3 -m json.tool
echo ""

echo "=== SIGN-UP on IAM (8090) via /api/v1/auth/signup ==="
curl -sS -i -X POST http://localhost:8090/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"'"${EMAIL}"'","password":"'"${PASSWORD}"'","roles":["ROLE_CARRIER"]}'
echo ""

echo "=== SIGN-UP DRIVER on IAM (8090) via /api/v1/auth/signup ==="
curl -sS -i -X POST http://localhost:8090/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"'"${DRIVER_EMAIL}"'","password":"'"${DRIVER_PASSWORD}"'","roles":["ROLE_DRIVER"]}'
echo ""

echo "=== SIGN-IN on IAM (8090) via /api/v1/auth/signin ==="
curl -sS -i -X POST http://localhost:8090/api/v1/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"'"${EMAIL}"'","password":"'"${PASSWORD}"'"}'
echo ""

echo "=== SIGN-IN DRIVER on IAM (8090) via /api/v1/auth/signin ==="
curl -sS -i -X POST http://localhost:8090/api/v1/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"'"${DRIVER_EMAIL}"'","password":"'"${DRIVER_PASSWORD}"'"}'
echo ""

echo "=== SIGN-IN via Gateway (8080) /api/v1/auth/signin ==="
curl -sS -i -X POST http://localhost:8080/api/v1/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"'"${EMAIL}"'","password":"'"${PASSWORD}"'"}'
echo ""

echo "=== ADMIN SIGN-IN (IAM alias /api/v1/auth/signin) ==="
curl -sS -i -X POST http://localhost:8090/api/v1/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"'"${ADMIN_EMAIL}"'","password":"'"${ADMIN_PASSWORD}"'"}'
echo ""

ADMIN_TOKEN=$(curl -sS -X POST http://localhost:8090/api/v1/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"'"${ADMIN_EMAIL}"'","password":"'"${ADMIN_PASSWORD}"'"}' | \
  python3 -c 'import json,sys
try:
    data=json.load(sys.stdin)
    print(data.get("token",""))
except Exception:
    print("")')

if [ -n "$ADMIN_TOKEN" ]; then
  echo "=== ADMIN USERS via Gateway (requires ROLE_ADMIN) ==="
  curl -sS -i -X GET http://localhost:8080/api/v1/admin/users \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json"
  echo ""
fi
