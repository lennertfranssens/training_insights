# Training Insights

Training Insights is a small full-stack application to manage club trainings, questionnaires and notifications for athletes, trainers and admins.

This repository contains two main services:

- `traininginsights-backend` — Spring Boot (Java 17) REST API
- `traininginsights-frontend` — React (Vite) single-page application

## Quick start (Docker Compose)

Build and run the app using Docker Compose (recommended for production-like local runs):

1. Build images:

```bash
docker compose build
```

2. Start containers in the background:

```bash
docker compose up -d
```

3. To view logs:

```bash
docker compose logs -f
```

4. To stop and remove containers:

```bash
docker compose down
```

Note: there are also nested `docker-compose.yml` files in both `traininginsights-backend/` and `traininginsights-frontend/` if you want to run services individually.

## Build & run locally (development)

Backend (Java / Spring Boot):

- Requires JDK 17 and Maven
- From `traininginsights-backend/`:

```bash
mvn spring-boot:run
```

Frontend (React / Vite):

- Requires Node.js and npm
- From `traininginsights-frontend/`:

```bash
npm install
npm run dev
```

The frontend expects the backend at `/api` (same-origin) when served via Docker Compose or via a reverse proxy; when running frontend dev server you may need to configure a proxy (see `traininginsights-frontend/vite.config.js`).

## Tech stack

- Backend:
  - Java 17
  - Spring Boot
  - Spring Data JPA (PostgreSQL)
  - Flyway for migrations
  - JWT-based auth for API

- Frontend:
  - React with Vite
  - Material UI (MUI)
  - Axios for API calls
  - FullCalendar for calendar UI

- Dev / Ops:
  - Docker / Docker Compose
  - Nginx in front of the frontend (production image)

## Project layout

- `traininginsights-backend/`
  - `pom.xml` — Maven project
  - `Dockerfile` — backend image
  - `src/main/java/com/traininginsights/` — application code
    - `controller/`, `service/`, `repository/`, `model/`, `security/` etc.
  - `src/main/resources/application.yml` — config

- `traininginsights-frontend/`
  - `package.json`, `vite.config.js`, `Dockerfile`
  - `src/` — React app
    - `modules/` — app modules (pages, common components, api client)

## Configuration and environment

Key environment variables (can be set in Docker Compose):

- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` — Postgres connection
- `APP_UPLOADS_DIR` — location where attachments are stored inside the container (default `uploads`)
- `TI_JWT_SECRET` — application JWT secret
- `VAPID_PUBLIC`, `VAPID_PRIVATE` — VAPID keys for Web Push notifications

## Attachments and uploads

Attachments uploaded for trainings are stored under the configured uploads directory: `uploads/<trainingId>/filename` by default. When running in Docker make sure this path is persisted via a volume, otherwise uploaded files will be lost when containers are recreated.

## Notes for developers

- To run backend tests: `mvn test` from `traininginsights-backend/`.
- Frontend port (dev server) is configurable in `vite.config.js`.
- API base paths are under `/api/*`.
