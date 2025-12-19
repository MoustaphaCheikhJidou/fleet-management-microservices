#!/bin/bash
set -e

cd /Users/pro/Downloads/J2EE/pr/fleet-management-microservices

echo "=== Step 1: Render mvnw executable ==="
chmod +x mvnw
find . -name mvnw -type f -exec chmod +x {} \;

echo "=== Step 2: Build multi-modules with Maven ==="
./mvnw -DskipTests clean package

echo "=== Step 3: Build Docker images ==="
docker compose down -v 2>/dev/null || true
docker compose up -d --build

echo "=== Step 4: Wait for services to be healthy ==="
echo "Waiting 30 seconds for services to initialize..."
sleep 30

echo "=== Step 5: Check health ==="
curl -sS http://localhost:8090/actuator/health | python3 -m json.tool || echo "Health check failed"

echo "=== Setup complete ==="
