# Fleet Management Microservices (Docker + React)

Stack microservices (Spring Boot) + API Gateway + Eureka + Config Server + Frontend React (Nginx) + MailHog.

## URLs (Local)
- Frontend (UI): http://localhost:8081
- MailHog: http://localhost:8025
- Gateway API: http://localhost:8080
- Eureka: http://localhost:8761
- Config Server: http://localhost:8888

## Prérequis
- Docker Desktop (obligatoirement démarré)
- Docker Compose v2 (docker compose)
- (Optionnel) Node.js 18+ / Python3 si tu veux lancer des scripts localement

## Démarrage rapide
docker compose up -d --build

Vérifier que l’UI répond:
curl -s -o /dev/null -w "HOME=%{http_code}\n"  http://localhost:8081/ && curl -s -o /dev/null -w "LOGIN=%{http_code}\n" http://localhost:8081/login && curl -s -o /dev/null -w "ADMIN=%{http_code}\n" http://localhost:8081/admin

Logs utiles:
docker compose logs -f gateway-service iam-service frontend-react-ui mailhog

Arrêter:
docker compose down

## Services (Ports)
| Service | Port | Health |
|---|---:|---|
| config-service | 8888 | /actuator/health |
| eureka-service | 8761 | /actuator/health |
| gateway-service | 8080 | /actuator/health |
| iam-service | 8081 | /actuator/health |
| profiles-service | 8082 | /actuator/health |
| vehicles-service | 8083 | /actuator/health |
| shipments-service | 8084 | /actuator/health |
| issues-service | 8085 | /actuator/health |
| frontend-react-ui (nginx) | 80 (interne) | — |
| mailhog | 8025 | — |
\
## Auth / Token JWT (ADMIN)
TOKEN="$(curl -s -X POST http://localhost:8081/api/v1/auth/signin -H "Content-Type: application/json" -d '{"email":"superadmin@example.com","password":"ChangeMe_Admin!123"}' | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')"
echo "TOKEN_LEN=${#TOKEN}"

## API Admin — créer un utilisateur (avec mot de passe)
Créer un ADMIN:
curl -i -X POST http://localhost:8081/api/v1/admin/users -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"email":"admin_test_01@example.com","fullName":"Admin Test 01","role":"ADMIN","password":"ChangeMe_123!","metadata":{}}'

Créer un EXPLOITANT (CARRIER):
curl -i -X POST http://localhost:8081/api/v1/admin/users -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"email":"operator_test_01@example.com","fullName":"Operator Test 01","role":"CARRIER","password":"ChangeMe_123!","metadata":{"company":"TestCo","city":"Nouakchott","fleetSize":1,"phone":""}}'

Créer un CONDUCTEUR (DRIVER):
curl -i -X POST http://localhost:8081/api/v1/admin/users -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"email":"driver_test_01@example.com","fullName":"Driver Test 01","role":"DRIVER","password":"ChangeMe_123!","metadata":{"phone":""}}'

Lister les utilisateurs:
curl -s http://localhost:8081/api/v1/admin/users -H "Authorization: Bearer $TOKEN" | head -c 2000; echo

## MailHog
UI: http://localhost:8025
curl -s http://localhost:8025/api/v1/messages | head -n 40

## Smoke tests (Shell)
chmod +x scripts/*.sh
./scripts/diagnose_login.sh
./scripts/db_audit.sh
./scripts/iam_invite_smoke.sh; echo "exit code=$?"

## Validations Frontend (Playwright / Scans)
python3 frontend-react/scripts/scan_forbidden.py
node frontend-react/scripts/prove_login_flow.js
node frontend-react/scripts/prove_admin_page_loads.js
node frontend-react/scripts/prove_admin_charts_never_disappear.js
node frontend-react/scripts/prove_admin_create_admin_with_password.js
node frontend-react/scripts/prove_admin_vehicle_refresh.js
node frontend-react/scripts/prove_driver_dashboard.js
node frontend-react/scripts/prove_operator_dashboard.js

## Reset complet (DB / volumes)
docker compose down -v
docker compose up -d --build

## Dépannage
401 Unauthorized: token manquant/expiré/mauvais header Authorization
403 Forbidden: utilisateur sans ROLE_ADMIN
