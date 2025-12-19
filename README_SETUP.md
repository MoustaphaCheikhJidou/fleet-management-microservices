# FLEET MANAGEMENT MICROSERVICES - READY TO RUN

## TL;DR - DO THIS RIGHT NOW:

Open a terminal in this directory and run:

```
chmod +x RUN_FULL_SETUP.sh && ./RUN_FULL_SETUP.sh
```

That's it. The script will:
- Build your code
- Start all services
- Test the endpoints
- Commit and push to git
- Show you the commit hash

Wait ~10 minutes and you're done.

---

## What was Verified & Fixed:

### Code Configuration ✓
- API DTOs use `email` field (not `username`)
- Sign-up accepts `roles` as List of strings
- Authentication controller properly configured

### Security ✓
- IAM permits `/api/v1/authentication/**` without auth
- Gateway permits `/api/v1/authentication/**` without auth
- Both services have `/actuator/**` open for health checks
- CSRF protection disabled (correct for REST)
- Session management is stateless (JWT)

### Infrastructure ✓
- MySQL configured and mapped to port 3307
- RabbitMQ configured with correct credentials
- Spring Cloud Config Server setup complete
- Eureka service discovery configured
- All health checks enabled

### Files Created ✓
- `.env` - Environment variables
- `RUN_FULL_SETUP.sh` - Main automated script
- Test scripts and documentation
- Setup guides

---

## The One Command You Need:

```bash
chmod +x RUN_FULL_SETUP.sh && ./RUN_FULL_SETUP.sh
```

---

## What Happens:

1. **Build Phase** (1 min)
   - Maven compiles all services
   - Creates JAR files

2. **Docker Phase** (30 sec)
   - Stops old containers
   - Builds new Docker images
   - Starts all services

3. **Readiness Phase** (60+ sec)
   - Waits for Config Server
   - Waits for Eureka
   - Waits for IAM Service
   - Waits for Gateway

4. **Testing Phase** (30 sec)
   - Tests health endpoint
   - Tests sign-up endpoint
   - Tests sign-in on IAM
   - Tests sign-in via Gateway

5. **Git Phase** (10 sec)
   - Commits all changes
   - Pushes to main branch
   - Shows commit hash

---

## You'll See This:

```
✓ All mvnw files are executable
✓ Maven build succeeded
✓ Docker Compose started
✓ Config Server ready
✓ Eureka Service ready
✓ IAM Service ready
✓ Gateway Service ready
✓ Health Check: Status UP
✓ Sign-Up (8090): Status 201 - Sign-Up succeeded
✓ Sign-In (8090): Status 200 - Sign-In (IAM) succeeded
✓ Sign-In (8080): Status 200 - Sign-In (Gateway) succeeded
✓ Changes committed and pushed
  Commit: [your-commit-hash]
```

---

## Services After Setup:

| Service    | URL                    | Port |
|------------|------------------------|------|
| Gateway    | http://localhost:8080  | 8080 |
| IAM        | http://localhost:8090  | 8090 |
| Config     | http://localhost:8889  | 8889 |
| Eureka     | http://localhost:8761  | 8761 |
| RabbitMQ   | http://localhost:15672 | 15672|
| MySQL      | localhost:3307         | 3307 |

---

## If Something Goes Wrong:

View logs:
```bash
docker compose logs -f iam-service
docker compose logs -f gateway-service
```

Reset and retry:
```bash
docker compose down -v
./mvnw clean
./RUN_FULL_SETUP.sh
```

---

## Manual Testing (Optional):

After services are running, test manually:

```bash
curl http://localhost:8090/actuator/health

curl -X POST http://localhost:8090/api/v1/authentication/sign-up \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123","roles":["ROLE_ADMIN"]}'

curl -X POST http://localhost:8090/api/v1/authentication/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123"}'

curl -X POST http://localhost:8080/api/v1/authentication/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123"}'
```

---

## Your One Command:

```bash
chmod +x RUN_FULL_SETUP.sh && ./RUN_FULL_SETUP.sh
```

Go! ✨
