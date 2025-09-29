# TrainingInsights Backend

Java 17 + Spring Boot 3.x backend for managing track & field athletes, trainings, and questionnaires.

## Quick Start

### 1) With Docker
```
docker compose up --build
```
- App: http://localhost:8080
- Swagger UI: http://localhost:8080/swagger-ui/index.html

A default **superadmin** is created on startup:
- Email: `superadmin@ti.local`
- Password: `superadmin`

### 2) Local Dev (requires PostgreSQL)
Set env vars and run:
```
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=traininginsights
export DB_USER=postgres
export DB_PASS=postgres
export TI_JWT_SECRET=dev-secret-change-me
mvn spring-boot:run
```

## Auth
- `POST /api/auth/signup` — registers an **athlete** by default.
- `POST /api/auth/signin` — returns JWT on success.

## Roles
- `ROLE_ATHLETE`, `ROLE_TRAINER`, `ROLE_ADMIN`, `ROLE_SUPERADMIN`

## Seed Data
On boot, roles are ensured and a default superadmin is created.

## Docker Images
- Java app built with multi-stage Dockerfile
- PostgreSQL 15 with durable volume

## License
MIT
