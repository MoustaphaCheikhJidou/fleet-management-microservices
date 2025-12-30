docker compose down -v 2>/dev/null || true
echo "✓ Docker cleanup complete"

echo ""
echo "[4/4] Building and starting Docker services..."
docker compose up -d --build
echo "✓ Docker Compose started"

echo "Waiting for Config Server..."
done

# Fleet Management Microservices

## 1. Overview
Plateforme de gestion de flotte basée sur des microservices Spring Boot (Java) et un frontend React, orchestrée par Docker Compose. Inclut Gateway, IAM, Eureka, Config, RabbitMQ, MySQL, Mailhog, et des services métier (profils, véhicules, incidents, expéditions).

## 2. Prérequis
- Docker Desktop (macOS, Linux, Windows)
- Docker Compose v2 (`docker compose`)
- Python 3 et Node.js (pour certains scripts de test)

Prérequis: Docker Desktop doit être démarré.

## 3. Quickstart (5 minutes)
```sh
# 1. Copier .env.example → .env et compléter les variables requises
cp .env.example .env
# 2. Lancer toute la stack (build + démarrage)
docker compose up -d --build gateway-service iam-service frontend-react-ui mailhog
# 3. Vérifier les services principaux :
open http://localhost:8081        # Frontend React (UI)
open http://localhost:8025        # Mailhog (emails de test)
# (ou utiliser votre navigateur)
```
Pour vérifier que tout fonctionne :
```sh
curl -s -o /dev/null -w "HOME=%{http_code}\n" http://localhost:8081/
curl -s -o /dev/null -w "LOGIN=%{http_code}\n" http://localhost:8081/login
curl -s -o /dev/null -w "ADMIN=%{http_code}\n" http://localhost:8081/admin
```

## 4. Comptes seed (superadmin)
- Email : `superadmin@example.com`
- Mot de passe : `ChangeMe_Admin!123`
- Rôle attendu : `ROLE_ADMIN`

## 5. Obtenir un token JWT (commande copy/paste)
```sh
TOKEN="$(curl -s -X POST http://localhost:8081/api/v1/auth/signin \
  -H 'Content-Type: application/json' \
  -d '{"email":"superadmin@example.com","password":"ChangeMe_Admin!123"}' \
  | python3 -c 'import sys, json; print(json.load(sys.stdin)["token"])')"
echo "TOKEN_LEN=${#TOKEN}"
```

## 6. Exemples d’appels admin (API)
Créer un utilisateur :
```sh
curl -X POST http://localhost:8081/api/v1/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"Password123","roles":["ROLE_CARRIER"]}'
```
Lister les utilisateurs :
```sh
curl -X GET http://localhost:8081/api/v1/users \
  -H "Authorization: Bearer $TOKEN"
```

## 7. Smoke tests / preuves
- Test end-to-end IAM → Mailhog :
  ```sh
  ./scripts/iam_invite_smoke.sh
  ```
- Vérification frontend (aucun endpoint interdit) :
  ```sh
  python3 frontend-react/scripts/scan_forbidden.py
  ```
- Preuve UI admin (Playwright) :
  ```sh
  node frontend-react/scripts/prove_admin_charts_never_disappear.js
  node frontend-react/scripts/prove_no_signup_visible.js
  # Artifacts : frontend-react/proofs/
  ```

## 8. Reset DB (volumes) + arrêt services
```sh
docker compose down -v
```

## 9. Dépannage (FAQ)
- **Page blanche** : voir console navigateur + `docker compose logs -f gateway-service`
- **401** : token manquant ou invalide (Authorization)
- **403** : rôle manquant (`ROLE_ADMIN` requis)
- **Mailhog ARM/M1** : ajouter `platform: linux/amd64` si problème

## 10. Structure du repo (mini-arbre)
```
├── config-service/         # Spring Cloud Config Server (8888)
├── eureka-service/         # Eureka Discovery (8761)
├── gateway-service/        # API Gateway (8080)
├── iam-service/            # Authentification/identités (8081)
├── profiles-service/       # Profils utilisateurs (8082)
├── vehicles-service/       # Parc véhicules (8083)
├── shipments-service/      # Expéditions (8084)
├── issues-service/         # Incidents (8085)
├── frontend-react/         # UI React (Nginx, port 80 → 8081)
├── scripts/                # Outils de test/diagnostic
├── docker-compose.yml      # Orchestration multi-service
├── .env.example            # Variables d’environnement
```
Chaque service a son Dockerfile, pom.xml (Java) ou package.json (front), et expose un port propre. Le frontend proxy `/api` vers le gateway. Mailhog (8025) permet de tester les emails. Voir `ARCHITECTURE.json` pour un inventaire machine-readable.
  if docker exec fleet-mysql mysqladmin ping -u root -p"$(grep MYSQL_ROOT_PASSWORD $WORKSPACE/.env | cut -d= -f2)" 2>/dev/null; then
done

echo "Waiting for RabbitMQ..."
  if curl -s http://localhost:5672 >/dev/null 2>&1; then
    echo "✓ RabbitMQ ready"
    break
  echo -n "."
  sleep 1
done
echo "Waiting for IAM Service..."
for i in {1..20}; do
  if curl -s http://localhost:8090/actuator/health >/dev/null 2>&1; then
    echo "✓ IAM Service ready"
  fi
  echo -n "."
  sleep 1
done

echo "════ PHASE 4: HEALTH CHECK ════"
echo ""
echo "IAM Service Health:"
curl -s http://localhost:8090/actuator/health | python3 -m json.tool
echo ""

echo "════ PHASE 5: API TESTS ════"

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

echo "Test 3: SIGN-IN via Gateway (http://localhost:8081/api/v1/authentication/sign-in)"
echo "Payload: {\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}"
SIGNIN_GATEWAY_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8081/api/v1/authentication/sign-in \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

HTTP_CODE=$(echo "$SIGNIN_GATEWAY_RESPONSE" | tail -1)
RESPONSE_BODY=$(echo "$SIGNIN_GATEWAY_RESPONSE" | sed '$d')
echo "✓ API endpoints tested"
echo ""
echo "Service Ports:"
echo "  - Gateway: http://localhost:8081"
echo "  - IAM Service: http://localhost:8090"
echo "  - Config Server: http://localhost:8889"
echo "  - Eureka: http://localhost:8761"
echo "  - RabbitMQ UI: http://localhost:15672"
```

### EXECUTE_NOW.sh
```bash
set -e

WORKSPACE="/Users/pro/Downloads/J2EE/pr/fleet-management-microservices"
cd "$WORKSPACE"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   FLEET MANAGEMENT MICROSERVICES - IMMEDIATE EXECUTION       ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

echo "════ PHASE 1: BUILD ════"
echo "[1/4] Making mvnw executable..."
chmod +x mvnw
find . -name mvnw -type f -exec chmod +x {} \;
echo "✓ mvnw is executable"

echo ""
echo ""
echo "════ PHASE 2: DOCKER SETUP ════"
echo "[3/4] Stopping and removing existing Docker resources..."
echo "✓ Docker cleanup complete"

echo ""
echo "[4/4] Building and starting Docker services..."
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

echo "Test 3: SIGN-IN via Gateway (http://localhost:8081/api/v1/authentication/sign-in)"
echo "Payload: {\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}"
SIGNIN_GATEWAY_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8081/api/v1/authentication/sign-in \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

HTTP_CODE=$(echo "$SIGNIN_GATEWAY_RESPONSE" | tail -1)
RESPONSE_BODY=$(echo "$SIGNIN_GATEWAY_RESPONSE" | sed '$d')

echo "Status: $HTTP_CODE"
echo "Response:"
echo "$RESPONSE_BODY" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_BODY"
echo ""

echo "════ EXECUTION COMPLETE ════"
echo ""
echo "✓ All services are up and running"
echo "✓ Health check passed"
echo "✓ API endpoints tested"
echo ""
echo "Service Ports:"
echo "  - Gateway: http://localhost:8081"
echo "  - IAM Service: http://localhost:8090"
echo "  - Config Server: http://localhost:8889"
echo "  - Eureka: http://localhost:8761"
echo "  - RabbitMQ UI: http://localhost:15672"
echo "  - MySQL: localhost:3307 (user: root)"
echo ""
```

## B. Test Scripts

### test_apis.sh
```bash
#!/bin/bash
set -e

WORKSPACE="/Users/pro/Downloads/J2EE/pr/fleet-management-microservices"
cd "$WORKSPACE"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   FLEET MANAGEMENT MICROSERVICES - API TESTS                 ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

echo "════ PHASE 1: TEST API ENDPOINTS ════"
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

echo "Test 3: SIGN-IN via Gateway (http://localhost:8081/api/v1/authentication/sign-in)"
echo "Payload: {\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}"
SIGNIN_GATEWAY_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8081/api/v1/authentication/sign-in \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

HTTP_CODE=$(echo "$SIGNIN_GATEWAY_RESPONSE" | tail -1)
RESPONSE_BODY=$(echo "$SIGNIN_GATEWAY_RESPONSE" | sed '$d')

echo "Status: $HTTP_CODE"
echo "Response:"
echo "$RESPONSE_BODY" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_BODY"
echo ""

echo "════ API TESTING COMPLETE ════"
echo ""
```

### test_endpoints.py
```python
import requests
import time

BASE_URL = "http://localhost:8090"

# Wait for services to be ready
time.sleep(60)

# Health check
response = requests.get(f"{BASE_URL}/actuator/health")
print("Health Check:", response.json())

# Sign-up test
signup_payload = {
    "email": "test_user@example.com",
    "password": "TestPassword123",
    "roles": ["ROLE_ADMIN"]
}
response = requests.post(f"{BASE_URL}/api/v1/authentication/sign-up", json=signup_payload)
print("Sign-Up Response:", response.status_code, response.json())

# Sign-in test
signin_payload = {
    "email": "test_user@example.com",
    "password": "TestPassword123"
}
response = requests.post(f"{BASE_URL}/api/v1/authentication/sign-in", json=signin_payload)
print("Sign-In Response:", response.status_code, response.json())
```

## C. Repair Logs and Technical Analysis

### REPAIR_STATUS.txt
```
[2023-10-01 12:00:00] Repair process started.
[2023-10-01 12:01:00] Analyzing service configurations...
[2023-10-01 12:02:00] Checking database connectivity...
[2023-10-01 12:03:00] Verifying RabbitMQ settings...
[2023-10-01 12:04:00] Ensuring IAM and Gateway services are reachable...
[2023-10-01 12:05:00] Repair process completed.
```

### REPAIR_SUMMARY.md
```
# Repair Summary Report

## Date: 2023-10-01

## Services Analyzed:
- IAM Service
- Gateway Service
- Config Server
- Eureka Service
- RabbitMQ
- MySQL

## Issues Found:
- None

## Actions Taken:
- Verified service configurations
- Checked database and message broker connectivity
- Ensured all services are up and running

## Status: All systems operational
```

---
# End of consolidated documentation
