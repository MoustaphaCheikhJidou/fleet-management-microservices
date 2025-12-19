# Fleet Management Microservices

Microservices stack (Spring Boot) with Gateway, Config Server, Eureka, IAM, RabbitMQ, MySQL and several domain services. This repository contains the code and Docker Compose configuration to run the stack locally.

## Prerequisites

- macOS with Docker Desktop installed
- Docker Compose (v2; use `docker compose`)
- Java & Maven are not strictly required to run via Docker images, but required to build locally
- Copy `.env.example` to `.env` and update secrets before running

## Setup

1. Copy example env file:

```zsh
cp .env.example .env
# edit .env and replace placeholders with secure values
```

2. Ensure Maven wrapper is executable (if you plan to build locally):

```zsh
chmod +x mvnw
# and for all modules if needed
find . -name mvnw -exec chmod +x {} \;
```

## Run the stack

Start containers:

```zsh
docker compose up -d --build
```

Stop and remove:

```zsh
docker compose down -v
```

## Service Ports

- Gateway: http://localhost:8080
- Config Server: http://localhost:8888
- Eureka: http://localhost:8761
- IAM service: http://localhost:8090
- Profiles: http://localhost:9090
- Vehicles: http://localhost:8095
- Shipments: http://localhost:8070
- Issues: http://localhost:8096
- MySQL (host port): 3307 (container 3306)
- RabbitMQ management UI: http://localhost:15672

## Environment variables (from `.env`)

- `MYSQL_ROOT_PASSWORD` - MySQL root password
- `MYSQL_ROOT_HOST` - MySQL allowed root host (default `%`)
- `RABBITMQ_DEFAULT_USER` / `RABBITMQ_DEFAULT_PASS` - RabbitMQ credentials
- `JWT_SECRET` - JWT secret used by Gateway (not committed)

## How to test IAM (SignUp / SignIn)

Important: IAM controllers expect JSON payload fields `email` and `password` (not `username`). Roles are a JSON array of strings like `["ROLE_CARRIER"]`.

Sign-up example (curl):

```zsh
curl -X POST http://localhost:8090/api/v1/authentication/sign-up \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"Password123","roles":["ROLE_CARRIER"]}'
```

Sign-in example (curl):

```zsh
curl -X POST http://localhost:8090/api/v1/authentication/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"Password123"}'
```

If using the gateway (recommended), target the gateway endpoint instead of IAM service directly:

```zsh
curl -X POST http://localhost:8080/api/v1/authentication/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"Password123"}'
```

## RabbitMQ management

- URL: http://localhost:15672
- Credentials: configured from your `.env` (`RABBITMQ_DEFAULT_USER` / `RABBITMQ_DEFAULT_PASS`)

## Notes on security and debugging

- Do NOT commit real secrets. Use `.env` on your host and keep `.env.example` in the repo.
- The Gateway uses a `RoleAuthorizationFilter` that expects an `X-User-Roles` header for protected routes. Authentication routes are configured as public via the gateway config.
- If `sign-in` or `sign-up` returns `403`, ensure you are sending payloads with `email` field and that the gateway isn't applying role checks to the authentication route.

## Troubleshooting

- To view service logs:

```zsh
docker compose logs -f gateway-service
docker compose logs -f iam-service
```

- To inspect RabbitMQ:

```zsh
docker compose exec rabbitmq rabbitmq-diagnostics status
```
# fleet-management-microservices
This repository contains the microservices-based backend for a Fleet Management application. Designed following Domain-Driven Design (DDD) principles and built around clearly defined bounded contexts, the system embraces a decentralized architecture to enhance scalability, maintainability, and independent deployment of services.
# fleet-management-microservices
