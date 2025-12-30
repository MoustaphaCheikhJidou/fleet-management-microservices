# Fleet Management Platform (Microservices)

A fleet operations web application built with a Spring Boot microservices backend and a React frontend.

It’s designed for **fleet owners/operators** and their teams to manage day-to-day transportation operations in one place: users, vehicles, shipments, and operational issues—secured with role-based access.

## What this application does (non-technical overview)

### Main roles
- **Admin**: manages the platform (creates users, monitors data and KPIs).
- **Operator (Carrier / Exploitant)**: manages the fleet (vehicles, operations).
- **Driver**: interacts with assigned tasks and operational information.

### Core features
- **Authentication & roles** (JWT): Admin-only endpoints require `ROLE_ADMIN`.
- **User management**: create Admin/Operator/Driver accounts.
- **Fleet management**: register vehicles and keep lists/KPIs in sync.
- **Shipments**: track shipment lifecycle (creation, status, visibility).
- **Issues**: report and follow incidents/issues tied to operations.
- **Dev email testing**: outbound emails are captured by MailHog (local dev).

## Architecture at a glance
- **React SPA** served by Nginx (`frontend-react-ui`)
- **API Gateway** routes requests to services (role filtering at gateway + service security)
- **Service discovery** with Eureka
- **Centralized config** with Config Server
- Domain services: IAM, Profiles, Vehicles, Shipments, Issues

## Services
| Component | Folder | Default Port | Notes |
|---|---|---:|---|
| Config Server | `config-service` | 8888 | Central configuration |
| Eureka | `eureka-service` | 8761 | Service discovery |
| API Gateway | `gateway-service` | 8080 | Routing + gateway filters |
| IAM (Auth + Users) | `iam-service` | 8081 | Sign-in + admin user management |
| Profiles | `profiles-service` | 8082 | User profile domain |
| Vehicles | `vehicles-service` | 8083 | Fleet/vehicle domain |
| Shipments | `shipments-service` | 8084 | Shipment domain |
| Issues | `issues-service` | 8085 | Issues/incidents domain |
| Frontend UI (Nginx) | `frontend-react` | 8081 (host) | Web UI + API proxy |
| MailHog | (compose) | 8025 | Email inbox for dev |

## Quick start (Docker)
docker compose up -d --build

Check containers:
docker compose ps

Follow logs (useful when something “doesn’t refresh”):
docker compose logs -f gateway-service iam-service vehicles-service frontend-react-ui mailhog

Stop:
docker compose down

Full reset (removes DB volumes):
docker compose down -v
docker compose up -d --build

## Getting an Admin JWT token (copy/paste)
TOKEN="$(curl -s -X POST http://localhost:8081/api/v1/auth/signin -H "Content-Type: application/json" -d '{"email":"superadmin@example.com","password":"ChangeMe_Admin!123"}' | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')"
echo "TOKEN_LEN=${#TOKEN}"

## Admin API examples (create users with password)
Create an Admin:
curl -i -X POST http://localhost:8081/api/v1/admin/users -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"email":"admin_test_01@example.com","fullName":"Admin Test 01","role":"ADMIN","password":"ChangeMe_123!","metadata":{}}'

Create an Operator (Carrier):
curl -i -X POST http://localhost:8081/api/v1/admin/users -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"email":"operator_test_01@example.com","fullName":"Operator Test 01","role":"CARRIER","password":"ChangeMe_123!","metadata":{"company":"TestCo","city":"Nouakchott","fleetSize":1,"phone":""}}'

Create a Driver:
curl -i -X POST http://localhost:8081/api/v1/admin/users -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"email":"driver_test_01@example.com","fullName":"Driver Test 01","role":"DRIVER","password":"ChangeMe_123!","metadata":{"phone":""}}'

List users:
curl -s http://localhost:8081/api/v1/admin/users -H "Authorization: Bearer $TOKEN" | head -c 2000; echo

## Email (MailHog) checks
curl -s http://localhost:8025/api/v1/messages | head -n 40

## Smoke tests (shell)
chmod +x scripts/*.sh
./scripts/diagnose_login.sh
./scripts/db_audit.sh
./scripts/iam_invite_smoke.sh; echo "exit code=$?"

## Frontend verification scripts
node frontend-react/scripts/prove_login_flow.js
node frontend-react/scripts/prove_admin_page_loads.js
node frontend-react/scripts/prove_admin_charts_never_disappear.js
node frontend-react/scripts/prove_admin_create_admin_with_password.js
node frontend-react/scripts/prove_admin_vehicle_refresh.js
node frontend-react/scripts/prove_driver_dashboard.js
node frontend-react/scripts/prove_operator_dashboard.js

## Troubleshooting
- 401 Unauthorized: missing/expired token or wrong `Authorization: Bearer <token>` header.
- 403 Forbidden: the signed-in user does not have the required role (Admin endpoints require `ROLE_ADMIN`).
- UI looks stale after create: check browser console + `gateway-service` / domain service logs; verify the UI calls the expected endpoints and the dashboard reloads state after mutations.
- No emails: ensure `mailhog` is running and the service is configured to deliver to it in docker-compose.

## Prerequisites (install once)
- Docker Desktop (must be running)
- Docker Compose v2 (`docker compose`)
- Optional (for local scripts outside containers):
  - Node.js 18+
