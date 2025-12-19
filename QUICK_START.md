## FLEET MANAGEMENT - QUICK START

This directory now includes automated setup scripts to get the entire microservices stack running.

### Option 1: AUTOMATIC SETUP (Recommended)

**This single command does everything:**

```bash
chmod +x RUN_FULL_SETUP.sh && ./RUN_FULL_SETUP.sh
```

**What it does:**
1. Makes Maven executable
2. Builds all services (skip tests)
3. Builds and starts Docker containers
4. Waits for all services to be healthy
5. Tests authentication endpoints
6. Commits changes and pushes to main

**Expected output:** All tests pass, services UP, commit hash shown

---

### Option 2: STEP-BY-STEP

If you prefer manual control:

```bash
# Step 1: Build
chmod +x mvnw
find . -name mvnw -type f -exec chmod +x {} \;
./mvnw -DskipTests clean package

# Step 2: Docker
docker compose down -v
docker compose up -d --build

# Step 3: Wait (60 seconds for services)
sleep 60

# Step 4: Test
curl -s http://localhost:8090/actuator/health | python3 -m json.tool

# Step 5: API Tests (examples)
curl -X POST http://localhost:8090/api/v1/authentication/sign-up \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","roles":["ROLE_ADMIN"]}'

curl -X POST http://localhost:8090/api/v1/authentication/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

curl -X POST http://localhost:8080/api/v1/authentication/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Step 6: Commit
git add -A
git commit -m "Fix auth payloads + security gateway/IAM + rabbit config"
git push origin main
```

---

### Service Ports

| Service           | URL                        |
|-------------------|---------------------------|
| **Gateway**       | http://localhost:8080      |
| **IAM Service**   | http://localhost:8090      |
| **Config Server** | http://localhost:8889      |
| **Eureka**        | http://localhost:8761      |
| **RabbitMQ UI**   | http://localhost:15672     |
| **MySQL**         | localhost:3307 (root)      |

---

### Verification Endpoints

**Health Check:**
```bash
curl http://localhost:8090/actuator/health
```

**Sign-Up (IAM - Direct):**
```bash
curl -X POST http://localhost:8090/api/v1/authentication/sign-up \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Pass123","roles":["ROLE_CARRIER"]}'
```

**Sign-In (IAM - Direct):**
```bash
curl -X POST http://localhost:8090/api/v1/authentication/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Pass123"}'
```

**Sign-In (Gateway - Proxied):**
```bash
curl -X POST http://localhost:8080/api/v1/authentication/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Pass123"}'
```

---

### Troubleshooting

**View logs:**
```bash
docker compose logs -f iam-service
docker compose logs -f gateway-service
```

**Reset everything:**
```bash
docker compose down -v
./mvnw clean
./RUN_FULL_SETUP.sh
```

**Common Issues:**
- **403 Forbidden**: Check WebSecurityConfiguration permits `/api/v1/authentication/**`
- **Connection refused**: Wait 60+ seconds for services to be ready
- **400 Bad Request**: Verify JSON payload uses `email`, not `username`
- **RabbitMQ DOWN**: Check docker-compose credentials match config-service YAML

---

### Files Overview

- **RUN_FULL_SETUP.sh** - Complete setup + test + git commit (Recommended)
- **COMPLETE_SETUP.sh** - Setup + test only (no git)
- **SETUP_GUIDE.md** - Detailed setup documentation
- **.env** - Environment variables (created from .env.example)
- **docker-compose.yml** - Service configuration
- **config-service/src/main/resources/configurations/** - Spring Cloud config files

---

### Expected Results

After running the setup script:

```
✓ All mvnw files are executable
✓ Maven build succeeded
✓ Docker cleanup complete
✓ Docker Compose started
✓ Config Server ready
✓ Eureka Service ready
✓ IAM Service ready
✓ Gateway Service ready
→ IAM Health Check (8090): Status UP
→ Test Sign-Up (IAM 8090): Status 201 - Sign-Up succeeded
→ Test Sign-In (IAM 8090): Status 200 - Sign-In succeeded
→ Test Sign-In (Gateway 8080): Status 200 - Sign-In succeeded
✓ Changes committed and pushed
  Commit: [hash]
```
