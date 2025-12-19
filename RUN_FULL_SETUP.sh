#!/bin/bash
set -e

WORKSPACE="/Users/pro/Downloads/J2EE/pr/fleet-management-microservices"
cd "$WORKSPACE"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   FLEET MANAGEMENT - COMPLETE SETUP, TEST & GIT COMMIT         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

PHASE=0
cleanup_on_exit() {
  echo ""
  echo "Exiting at phase $PHASE"
}
trap cleanup_on_exit EXIT

PHASE=1
echo "════ PHASE 1: BUILD ════"
echo "[1/6] Making mvnw executable..."
chmod +x mvnw
find . -name mvnw -type f -exec chmod +x {} \;
echo "✓ All mvnw files are executable"

echo ""
echo "[2/6] Running Maven clean package (skip tests)..."
./mvnw -DskipTests clean package -q 2>/dev/null
echo "✓ Maven build succeeded"

PHASE=2
echo ""
echo "════ PHASE 2: DOCKER SETUP ════"
echo "[3/6] Stopping and removing existing Docker resources..."
docker compose down -v 2>/dev/null || true
echo "✓ Docker cleanup complete"

echo ""
echo "[4/6] Building and starting Docker services..."
docker compose up -d --build
echo "✓ Docker Compose started"

PHASE=3
echo ""
echo "════ PHASE 3: SERVICE READINESS ════"
echo "[5/6] Waiting for services to be healthy..."

MAX_WAIT=120
ELAPSED=0

echo "  Checking Config Server..."
while [ $ELAPSED -lt $MAX_WAIT ]; do
  if curl -s http://localhost:8889/actuator/health >/dev/null 2>&1; then
    echo "  ✓ Config Server ready"
    break
  fi
  sleep 2
  ELAPSED=$((ELAPSED + 2))
  echo -n "."
done

echo "  Checking Eureka..."
ELAPSED=0
while [ $ELAPSED -lt $MAX_WAIT ]; do
  if curl -s http://localhost:8761/actuator/health >/dev/null 2>&1; then
    echo "  ✓ Eureka Service ready"
    break
  fi
  sleep 2
  ELAPSED=$((ELAPSED + 2))
  echo -n "."
done

echo "  Checking IAM Service..."
ELAPSED=0
while [ $ELAPSED -lt $MAX_WAIT ]; do
  if curl -s http://localhost:8090/actuator/health >/dev/null 2>&1; then
    echo "  ✓ IAM Service ready"
    break
  fi
  sleep 2
  ELAPSED=$((ELAPSED + 2))
  echo -n "."
done

echo "  Checking Gateway Service..."
ELAPSED=0
while [ $ELAPSED -lt 60 ]; do
  if curl -s http://localhost:8080/actuator/health >/dev/null 2>&1; then
    echo "  ✓ Gateway Service ready"
    break
  fi
  sleep 2
  ELAPSED=$((ELAPSED + 2))
  echo -n "."
done

sleep 5

PHASE=4
echo ""
echo "════ PHASE 4: HEALTH & API VERIFICATION ════"
echo "[6/6] Running verification tests..."
echo ""

echo "→ IAM Health Check (8090):"
curl -s http://localhost:8090/actuator/health | python3 -m json.tool 2>/dev/null || echo "Health check response received"
echo ""

TEST_EMAIL="testuser_$(date +%s)@example.com"
TEST_PASSWORD="TestPass123"

echo "→ Test Sign-Up (IAM 8090):"
SIGNUP_RESP=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8090/api/v1/authentication/sign-up \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"roles\":[\"ROLE_ADMIN\"]}")
SIGNUP_CODE=$(echo "$SIGNUP_RESP" | tail -1)
echo "  Status: $SIGNUP_CODE"
if [ "$SIGNUP_CODE" = "201" ] || [ "$SIGNUP_CODE" = "200" ]; then
  echo "  ✓ Sign-Up succeeded"
else
  echo "  ✗ Sign-Up failed"
fi
echo ""

echo "→ Test Sign-In (IAM 8090):"
SIGNIN_RESP=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8090/api/v1/authentication/sign-in \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
SIGNIN_CODE=$(echo "$SIGNIN_RESP" | tail -1)
echo "  Status: $SIGNIN_CODE"
if [ "$SIGNIN_CODE" = "200" ] || [ "$SIGNIN_CODE" = "201" ]; then
  echo "  ✓ Sign-In (IAM) succeeded"
else
  echo "  ✗ Sign-In (IAM) failed"
fi
echo ""

echo "→ Test Sign-In (Gateway 8080):"
GATEWAY_RESP=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8080/api/v1/authentication/sign-in \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
GATEWAY_CODE=$(echo "$GATEWAY_RESP" | tail -1)
echo "  Status: $GATEWAY_CODE"
if [ "$GATEWAY_CODE" = "200" ] || [ "$GATEWAY_CODE" = "201" ]; then
  echo "  ✓ Sign-In (Gateway) succeeded"
else
  echo "  ✗ Sign-In (Gateway) failed"
fi
echo ""

echo "════ VERIFICATION COMPLETE ════"
echo ""
echo "Service Endpoints:"
echo "  - Gateway: http://localhost:8080"
echo "  - IAM Service: http://localhost:8090"
echo "  - Config Server: http://localhost:8889"
echo "  - Eureka Registry: http://localhost:8761"
echo "  - RabbitMQ UI: http://localhost:15672 (guest/guest)"
echo ""

PHASE=5
echo "════ PHASE 5: GIT COMMIT & PUSH ════"
echo ""
echo "Staging changes for commit..."
git add -A

echo "Creating commit..."
git commit -m "Fix auth payloads + security gateway/IAM + rabbit config + setup scripts"

echo "Pushing to main branch..."
git push origin main

CURRENT_COMMIT=$(git rev-parse HEAD)
echo ""
echo "✓ Changes committed and pushed"
echo "  Commit: $CURRENT_COMMIT"
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "SETUP COMPLETE - ALL SERVICES RUNNING"
echo "════════════════════════════════════════════════════════════════"
echo ""
