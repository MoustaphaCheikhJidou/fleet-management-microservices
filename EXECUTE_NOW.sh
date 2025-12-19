#!/bin/bash

cd /Users/pro/Downloads/J2EE/pr/fleet-management-microservices

chmod +x mvnw
find . -name mvnw -type f -exec chmod +x {} \;

./mvnw -DskipTests clean package

docker compose down -v

docker compose up -d --build

sleep 60

curl -s http://localhost:8090/actuator/health | python3 -m json.tool

curl -s -i -X POST http://localhost:8090/api/v1/authentication/sign-up \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123","roles":["ROLE_ADMIN"]}'

curl -s -i -X POST http://localhost:8090/api/v1/authentication/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

curl -s -i -X POST http://localhost:8080/api/v1/authentication/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

git add -A
git commit -m "Fix auth payloads + security gateway/IAM + rabbit config"
git push origin main

git rev-parse HEAD
