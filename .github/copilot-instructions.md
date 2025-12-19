<!-- Short, focused guidance for AI coding agents working on this repo -->
# Copilot instructions — Fleet Management Microservices

This file contains concise, repository-specific guidance to help AI coding agents be productive quickly.

- Architecture: This is a Spring Boot microservices stack with the following important modules:
  - `config-service` — Spring Cloud Config server (port 8888).
  - `eureka-service` — service discovery (port 8761).
  - `gateway-service` — API gateway and route/filter logic (port 8080).
  - Domain services: `iam-service`, `profiles-service`, `vehicles-service`, `shipments-service`, `issues-service` (each is a self-contained Spring Boot module with its own `Dockerfile`).
  - `init-db/01-create-databases.sql` — SQL used to provision MySQL schemas.

- Key workflows (use these exact commands/examples):
  - Copy environment template before running: `cp .env.example .env` and edit secrets.
  - Build all modules locally: run from repo root `./mvnw -DskipTests package`.
  - Build a single module: `./mvnw -f gateway-service/pom.xml clean package`.
  - Run built JAR locally: `java -jar gateway-service/target/gateway-service-0.0.1-SNAPSHOT.jar` (replace module name/version).
  - Start full stack with Docker Compose: `docker compose up -d --build` (this repo uses Docker Compose v2 syntax; `docker-compose` aliases may exist but prefer `docker compose`).
  - Stop and remove: `docker compose down -v`.

- Integration and runtime patterns to preserve:
  - Services register with Eureka and fetch configuration from the Config Server — do not hard-code service locations; prefer using service names when composing requests or docker-compose links.
  - Each microservice exposes standard Spring Boot endpoints; controllers are under `*/src/main/java/**/controller`.
  - The Gateway contains routing and authorization filters (see `gateway-service/src/main/java`); the project uses a `RoleAuthorizationFilter` that expects an `X-User-Roles` header for protected routes.
  - IAM expects `email` and `password` JSON fields (not `username`) for sign-in/sign-up endpoints (see examples in `README.md`).

- Project conventions and file locations to reference when editing or adding code:
  - Module naming: modules end with `-service` and include a `Dockerfile`, `mvnw`, and `pom.xml` at the module root.
  - Config properties are served by `config-service` on port 8888 — look in `config-service/src/main/resources` for sample properties.
  - DB provisioning script: `init-db/01-create-databases.sql`.
  - Entrypoints and artifact names follow Maven defaults; built artifacts appear in `*/target/` with names like `*-0.0.1-SNAPSHOT.jar`.

- Testing & debugging notes discovered in repo:
  - Maven wrapper used everywhere — ensure `mvnw` is executable (`chmod +x mvnw` / `find . -name mvnw -exec chmod +x {} \;`).
  - You can tail service logs via Docker Compose: `docker compose logs -f gateway-service`.
  - For local iterative development, build the module and run the JAR rather than composing the whole stack when making single-service changes.

- When modifying integration points, check these files first:
  - `docker-compose.yml` and `docker-compose.prod.yml` — container ports and environment wiring.
  - `gateway-service/src/main/java` — gateway filters and route configurations.
  - `iam-service/src/main/java` — authentication controllers and DTOs (note `email` usage).
  - `init-db/01-create-databases.sql` — schema expectations for services.

- Useful examples to copy or mirror in PRs:
  - Use `./mvnw -f <module>/pom.xml clean package` for module CI steps.
  - Use `docker compose up -d --build` to reproduce local environment during integration fixes.

- Safety and secret handling:
  - Never commit secrets. The repo keeps `.env.example`; ensure any `.env` is in `.gitignore` locally.

If anything above is unclear or you want more detail (e.g., key Java packages, example controller paths, or CI commands), tell me which area to expand.
