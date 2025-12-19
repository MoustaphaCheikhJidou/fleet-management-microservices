#!/bin/bash
set -e

WORKSPACE="/Users/pro/Downloads/J2EE/pr/fleet-management-microservices"
cd "$WORKSPACE"

echo "========================================"
echo "FLEET MANAGEMENT - SETUP & BUILD SCRIPT"
echo "========================================"

echo ""
echo "Step 1: Create .env file..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo ".env created from .env.example"
else
  echo ".env already exists"
fi

echo ""
echo "Step 2: Make mvnw executable..."
chmod +x mvnw
find . -name mvnw -type f -exec chmod +x {} \;
echo "mvnw files are now executable"

echo ""
echo "Step 3: Build Maven multi-modules..."
./mvnw -DskipTests clean package 2>&1 | tail -20
echo "Maven build completed"

echo ""
echo "Step 4: Stop and cleanup old Docker containers..."
docker compose down -v 2>/dev/null || true
echo "Cleanup completed"

echo ""
echo "Step 5: Build and start Docker containers..."
docker compose up -d --build

echo ""
echo "Step 6: Wait for services to be healthy..."
echo "Waiting 40 seconds for all services to initialize..."
sleep 40

echo ""
echo "Step 7: Check IAM health status..."
HEALTH=$(curl -s http://localhost:8090/actuator/health 2>/dev/null || echo '{"status":"DOWN"}')
echo "Health response:"
echo "$HEALTH" | python3 -m json.tool 2>/dev/null || echo "$HEALTH"

echo ""
echo "========================================"
echo "Setup completed! Services should be running."
echo "========================================"
