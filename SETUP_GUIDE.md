# FLEET MANAGEMENT - SETUP AND REPAIR GUIDE

## Quick Start

Run this one command to setup everything:

```
bash COMPLETE_SETUP.sh
```

This script will:
1. Make mvnw executable
2. Build all Maven modules
3. Build and start Docker services
4. Wait for all services to be healthy
5. Run API tests (sign-up, sign-in)
6. Verify IAM and Gateway endpoints work correctly

## What Was Fixed/Verified

### 1. Configuration
- ✓ `.env` created with proper MySQL and RabbitMQ credentials
- ✓ IAM service configured with Docker profile
- ✓ Gateway service configured with proper routes and security
- ✓ Config server has correct service configurations

### 2. Security Configuration
- ✓ IAM `WebSecurityConfiguration` permits `/api/v1/authentication/**` and `/actuator/**`
- ✓ Gateway `WebFluxSecurityConfiguration` permits `/api/v1/authentication/**` and `/actuator/**`
- ✓ CSRF disabled on both services
- ✓ RabbitMQ and MySQL health checks enabled

### 3. API Payloads (Verified Correct)
- ✓ `SignInResource`: `record(String email, String password)`
- ✓ `SignUpResource`: `record(String email, String password, List<String> roles)`
- ✓ Both use `email` field (not `username`)
- ✓ Roles are sent as JSON array of strings: `["ROLE_ADMIN"]`

### 4. Docker Configuration
- ✓ docker-compose.yml has correct service dependencies
- ✓ All services have healthchecks
- ✓ RabbitMQ and MySQL use correct port mappings

## Manual Commands (if needed)

### Option 1: Full setup from scratch
```
chmod +x COMPLETE_SETUP.sh
./COMPLETE_SETUP.sh
```

### Option 2: Step by step
```
cd /Users/pro/Downloads/J2EE/pr/fleet-management-microservices
chmod +x mvnw
find . -name mvnw -type f -exec chmod +x {} \;
./mvnw -DskipTests clean package
docker compose down -v
docker compose up -d --build
sleep 60
curl -s http://localhost:8090/actuator/health | python3 -m json.tool
```

## Expected Results

### Health Check
```
curl http://localhost:8090/actuator/health
```
Should return:
```json
{
  "status": "UP",
  "components": {
    "db": {"status": "UP"},
    "rabbit": {"status": "UP"}
  }
}
```

### Sign-Up (8090)
```
curl -X POST http://localhost:8090/api/v1/authentication/sign-up \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123","roles":["ROLE_ADMIN"]}'
```
Expected: `201 Created` with user resource

### Sign-In (8090)
```
curl -X POST http://localhost:8090/api/v1/authentication/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```
Expected: `200 OK` with token

### Sign-In via Gateway (8080)
```
curl -X POST http://localhost:8080/api/v1/authentication/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```
Expected: `200 OK` with token

## Service Ports

- Gateway: http://localhost:8080
- IAM Service: http://localhost:8090
- Config Server: http://localhost:8889
- Eureka Service Registry: http://localhost:8761
- RabbitMQ Management UI: http://localhost:15672
- MySQL: localhost:3307 (credentials in .env)

## Troubleshooting

### If services don't start:
```
docker compose logs -f iam-service
docker compose logs -f gateway-service
docker compose logs -f eureka-service
```

### If authentication fails:
- Check MySQL is running: `docker ps | grep fleet-mysql`
- Check RabbitMQ is running: `docker ps | grep fleet-rabbitmq`
- Check Eureka health: `curl http://localhost:8761/actuator/health`

### Reset everything:
```
docker compose down -v
docker system prune -a
./mvnw clean
./COMPLETE_SETUP.sh
```

## After Everything Works

Commit and push changes:
```
cd /Users/pro/Downloads/J2EE/pr/fleet-management-microservices
git add -A
git commit -m "Fix auth payloads + security gateway/IAM + rabbit config"
git push origin main
```
