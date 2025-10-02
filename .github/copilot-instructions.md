# Copilot instructions for Training Insights

Purpose: Make AI coding agents productive immediately in this repo by capturing real project conventions, workflows, and cross-service patterns. Keep replies concise and actionable, cite files when relevant, and follow these norms unless a maintainer asks otherwise.

## Big picture
- Monorepo with two apps:
  - Backend: `traininginsights-backend` — Spring Boot 3 (Java 17), PostgreSQL, Flyway, JWT auth, OpenAPI/Swagger.
  - Frontend: `traininginsights-frontend` — React + Vite, MUI, Axios, served by NGINX in Docker.
- API base path: all controllers are under `/api/...` on the backend. Frontend targets `/api` via Vite dev proxy and Nginx in Docker.
- Auth: Stateless JWT (HS256). Token created in `AuthController` using `JwtService`, added to `Authorization: Bearer <token>` by the frontend interceptor. Roles: `ROLE_ATHLETE`, `ROLE_TRAINER`, `ROLE_ADMIN`, `ROLE_SUPERADMIN`.

## How to run
- Docker (recommended for integrated run): see root `docker-compose.yml`.
  - Services: `db` (Postgres 15), `backend` (8080), `frontend` (3000). Swagger: `http://localhost:8080/swagger-ui.html`.
  - Important env vars: `DB_*`, `TI_JWT_SECRET`, `APP_UPLOADS_DIR`, `VAPID_PUBLIC`, `VAPID_PRIVATE`.
  - A default superadmin is created on backend startup: `superadmin@ti.local` / `superadmin`.
- Local dev:
  - Backend: from `traininginsights-backend/` run `mvn spring-boot:run`. Config in `src/main/resources/application.yml`.
  - Frontend: from `traininginsights-frontend/` run `npm install` then `npm run dev` (Vite dev server at `http://localhost:5173`). Vite proxy sends `/api` to `http://localhost:8080`.

## Backend patterns
- Security
  - Entry points in `com.traininginsights.config.SecurityConfig`: permit `/api/auth/**` (and `/auth/**` for compatibility), OpenAPI paths; everything else requires JWT.
  - Filter: `JwtAuthenticationFilter` extracts and validates token via `JwtService`.
  - `JwtService` accepts Base64, URL-safe Base64, or raw secrets (hashed to 256-bit). Set `app.jwt.secret` via `TI_JWT_SECRET` env.
- Controllers live under `com.traininginsights.controller` and are mapped under `/api/...` (e.g., `AuthController`, `TrainingController`). Global error formatting in `RestExceptionHandler`.
- Persistence: Spring Data JPA with PostgreSQL. Flyway migrations under `src/main/resources/db/migration`. Hibernate `ddl-auto=update` in dev; disabled Flyway in `application-docker.yml`.
- Push notifications: `PushService` uses VAPID keys from env or latest DB `PushConfig`. If keys missing, it logs instead of sending.
- OpenAPI: annotations in `OpenApiConfig`; UI at `/swagger-ui.html`.

## Frontend patterns
- API client: `src/modules/api/client.js`
  - Base URL from `VITE_API_BASE` (defaults to "" so paths like `/api/...` work).
  - Request interceptor injects `Authorization: Bearer <token>` from `localStorage.ti_auth`.
  - 401 handler clears auth and redirects to `/login`.
- Auth state: `src/modules/auth/AuthContext.jsx` provides `signin`, `signup`, `signout`. Protected routes via `src/modules/common/ProtectedRoute.jsx` with role checks.
- UI stack: React 18, MUI 5, FullCalendar. Role-based dashboards under `src/modules/dashboards/` and pages under `src/modules/pages/`.
- Production serving: NGINX (`nginx/nginx.conf`) serves SPA and proxies `/api` to the backend service name (`backend:8080`).

## Conventions and gotchas
- Always use `/api/...` paths in the frontend; don’t hardcode hostnames. Rely on Vite proxy in dev and Nginx in prod.
- JWT secret (`TI_JWT_SECRET`) can be a raw string or Base64; backend derives a valid HS256 key if needed.
- Uploads directory is configured by `app.uploadsDir` (default `uploads`); ensure it’s persisted as a volume in Docker.
- When adding endpoints:
  - Put controllers in `com.traininginsights.controller` with `@RequestMapping("/api/<area>")`.
  - Secure by default; open only `/api/auth/**` or explicitly permit in `SecurityConfig` when necessary.
  - Document via OpenAPI annotations when helpful.
- Frontend navigation assumes SPA fallback; keep routes compatible with `nginx.conf` (`try_files $uri /index.html`).

## Useful references
- Root: `README.md` (quick start, envs)
- Backend: `traininginsights-backend/` (`pom.xml`, `application.yml`, `SecurityConfig.java`, `AuthController.java`, `RestExceptionHandler.java`)
- Frontend: `traininginsights-frontend/` (`vite.config.js`, `src/modules/api/client.js`, `src/modules/auth/AuthContext.jsx`, `src/modules/common/ProtectedRoute.jsx`)
- Docker: root `docker-compose.yml`, service Dockerfiles, NGINX config

## Example snippets
- Frontend call: `api.get('/api/trainings')` using the shared Axios instance.
- Backend controller mapping:
  - `@RestController @RequestMapping("/api/trainings")` with methods secured by JWT; roles can be enforced via `@PreAuthorize` if needed (method security enabled).

Keep responses practical: reference file paths, point to existing patterns, and prefer incremental changes that fit these conventions.
