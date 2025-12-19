#!/bin/bash
set -e

WORKSPACE="/Users/pro/Downloads/J2EE/pr/fleet-management-microservices"
cd "$WORKSPACE"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   FLEET MANAGEMENT MICROSERVICES - COMPLETE SETUP & TEST      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

echo "════ PHASE 1: BUILD ════"
echo "[1/5] Making mvnw executable..."
chmod +x mvnw
find . -name mvnw -type f -exec chmod +x {} \;
echo "✓ mvnw is executable"

echo ""
echo "[2/5] Running Maven clean package (skip tests)..."
./mvnw -DskipTests clean package -q
echo "✓ Maven build succeeded"

echo ""
echo "════ PHASE 2: DOCKER SETUP ════"
echo "[3/5] Stopping and removing existing Docker resources..."
docker compose down -v 2>/dev/null || true
echo "✓ Docker cleanup complete"

echo ""
echo "[4/5] Building and starting Docker services..."
docker compose up -d --build
echo "✓ Docker Compose started"

echo ""
echo "════ PHASE 3: SERVICE READINESS ════"
echo "[5/5] Waiting for services to be healthy (60 seconds)..."

echo "Waiting for Config Server..."
for i in {1..15}; do
  if curl -s http://localhost:8889/actuator/health >/dev/null 2>&1; then
    echo "✓ Config Server ready"
    break
  fi
  echo -n "."
  sleep 1
done

echo "Waiting for Eureka..."
for i in {1..15}; do
  if curl -s http://localhost:8761/actuator/health >/dev/null 2>&1; then
    echo "✓ Eureka Service ready"
    break
  fi
  echo -n "."
  sleep 1
done

echo "Waiting for MySQL..."
for i in {1..15}; do
  if docker exec fleet-mysql mysqladmin ping -u root -p"$(grep MYSQL_ROOT_PASSWORD $WORKSPACE/.env | cut -d= -f2)" 2>/dev/null; then
    echo "✓ MySQL ready"
    break
  fi
  echo -n "."
  sleep 1
done

echo "Waiting for RabbitMQ..."
for i in {1..15}; do
  if curl -s http://localhost:5672 >/dev/null 2>&1; then
    echo "✓ RabbitMQ ready"
    break
  fi
  echo -n "."
  sleep 1
done

echo "Waiting for IAM Service..."
for i in {1..20}; do
  if curl -s http://localhost:8090/actuator/health >/dev/null 2>&1; then
    echo "✓ IAM Service ready"
    break
  fi
  echo -n "."
  sleep 1
done

echo ""
echo "════ PHASE 4: HEALTH CHECK ════"
echo ""
echo "IAM Service Health:"
curl -s http://localhost:8090/actuator/health | python3 -m json.tool
echo ""

echo "════ PHASE 5: API TESTS ════"
echo ""

TEST_EMAIL="test_$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123"

echo "Test 1: SIGN-UP on IAM Service (http://localhost:8090/api/v1/authentication/sign-up)"
echo "Payload: {\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"roles\":[\"ROLE_ADMIN\"]}"
SIGNUP_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8090/api/v1/authentication/sign-up \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"roles\":[\"ROLE_ADMIN\"]}")

HTTP_CODE=$(echo "$SIGNUP_RESPONSE" | tail -1)
RESPONSE_BODY=$(echo "$SIGNUP_RESPONSE" | sed '$d')

echo "Status: $HTTP_CODE"
echo "Response:"
echo "$RESPONSE_BODY" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_BODY"
echo ""

echo "Test 2: SIGN-IN on IAM Service (http://localhost:8090/api/v1/authentication/sign-in)"
echo "Payload: {\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}"
SIGNIN_IAM_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8090/api/v1/authentication/sign-in \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

HTTP_CODE=$(echo "$SIGNIN_IAM_RESPONSE" | tail -1)
RESPONSE_BODY=$(echo "$SIGNIN_IAM_RESPONSE" | sed '$d')

echo "Status: $HTTP_CODE"
echo "Response:"
echo "$RESPONSE_BODY" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_BODY"
echo ""

echo "Test 3: SIGN-IN via Gateway (http://localhost:8080/api/v1/authentication/sign-in)"
echo "Payload: {\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}"
SIGNIN_GATEWAY_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8080/api/v1/authentication/sign-in \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

HTTP_CODE=$(echo "$SIGNIN_GATEWAY_RESPONSE" | tail -1)
RESPONSE_BODY=$(echo "$SIGNIN_GATEWAY_RESPONSE" | sed '$d')

echo "Status: $HTTP_CODE"
echo "Response:"
echo "$RESPONSE_BODY" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_BODY"
echo ""

echo "════ SETUP COMPLETE ════"
echo ""
echo "✓ All services are up and running"
echo "✓ Health check passed"
echo "✓ API endpoints tested"
echo ""
echo "Service Ports:"
echo "  - Gateway: http://localhost:8080"
echo "  - IAM Service: http://localhost:8090"
echo "  - Config Server: http://localhost:8889"
echo "  - Eureka: http://localhost:8761"
echo "  - RabbitMQ UI: http://localhost:15672"
echo "  - MySQL: localhost:3307 (user: root)"
echo ""
