#!/bin/bash

echo "=== HEALTH CHECK ==="
curl -sS http://localhost:8090/actuator/health | python3 -m json.tool
echo ""

echo "=== SIGN-UP on IAM (8090) ==="
curl -sS -i -X POST http://localhost:8090/api/v1/authentication/sign-up \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123","roles":["ROLE_ADMIN"]}'
echo ""

echo "=== SIGN-IN on IAM (8090) ==="
curl -sS -i -X POST http://localhost:8090/api/v1/authentication/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123"}'
echo ""

echo "=== SIGN-IN via Gateway (8080) ==="
curl -sS -i -X POST http://localhost:8080/api/v1/authentication/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123"}'
echo ""
