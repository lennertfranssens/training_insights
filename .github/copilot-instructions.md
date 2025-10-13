## Training Insights – Agent Quickstart
Concise, repo-specific rules so your changes align. Cite files/paths when giving guidance.

### 1) Architecture & Auth
- Monorepo: Spring Boot backend (`traininginsights-backend`) + React/Vite frontend (`traininginsights-frontend`).
- API lives under `/api/*`; frontend calls must be relative (e.g. `api.get('/api/metrics/dashboard')`). Never hardcode hosts.
- JWT auth (HS256) minted in `AuthController` (`/api/auth/signin`); roles: `ROLE_ATHLETE|ROLE_TRAINER|ROLE_ADMIN|ROLE_SUPERADMIN`. Claims include `roles` array (see `AuthController.java`).
- Public self‑signup is removed; users are provisioned by privileged roles. Inactive users must activate before signin.

### 2) Run, Ports, Creds
- Docker Compose (root `docker-compose.yml`) starts Postgres + backend:8080 + frontend:3000; Swagger at `/swagger-ui.html`.
- Local dev: backend `mvn spring-boot:run`; frontend `npm install && npm run dev` (Vite dev on 5173; proxy `/api` → 8080 via `vite.config.js`).
- Default superadmin (dev/demo): `superadmin@ti.local` / `superadmin` (see root `README.md`).
- Key env: `DB_*`, `TI_JWT_SECRET` (raw/Base64), `APP_UPLOADS_DIR` (persist), `VAPID_PUBLIC/PRIVATE` (push). SMTP lives on Club entities, not global env.

### 3) Backend patterns
- Security: `SecurityConfig.java` permits `/api/auth/**`, docs, health; everything else requires JWT. Use method security (`@PreAuthorize('hasRole("SUPERADMIN")'...)`).
- Auth flows in `AuthController.java`: `/activate`, `/password-reset/request`, `/password-reset/confirm`, `/resend-activation` (reset request always returns 200 to avoid enumeration).
- Consistent error shape via `RestExceptionHandler.java` (map with `status|error|message`).
- Backups: `AdminBackupController.java` (`/api/admin/backup/*`) uses `AdminBackupService`. Export JSON or ZIP (ZIP includes `uploads/`). Preserve IDs when importing.
- Migrations: Flyway SQL under `src/main/resources/db/migration`. `ddl-auto=update` is dev-only convenience.

### 4) Frontend patterns
- API client: `src/modules/api/client.js` adds `Authorization: Bearer <token>` from `localStorage.ti_auth`, and clears + redirects to `/login` on 401.
- Protected routing: `src/modules/common/ProtectedRoute.jsx`; dashboards are role-aware in `src/App.jsx`.
- Persisted prefs: `ti_auth`, `ti_theme_mode` (system/light/dark), `ti_metrics_club`.
- Date/time: Belgian format via `src/modules/common/dateUtils.js` + `BelgianPickers.jsx`. Theme provider in `ThemeContext.jsx` resolves system mode.

### 5) Notifications, Emails, Uploads
- Push via VAPID keys; email via Club-scoped SMTP. Channel for send (in‑app/email/both) chosen at send time. Bulk emails use BCC; sender receives a summary when email channel used.
- Uploads under `APP_UPLOADS_DIR` must be volume‑persisted. Paths are validated to stay within base dir—use existing services instead of building absolute paths.

### 6) Adding endpoints
- Controllers under `com.traininginsights.controller` with `@RestController @RequestMapping("/api/<area>")`. Secure by default; don’t `permitAll` unless required.
- If issuing custom tokens, include `roles` claim like in `AuthController`.

Common gotchas
- Missing `/api` prefix → 404. Hardcoded URLs break Docker/Nginx; keep them relative. Don’t leak details on activation/reset errors.

Reference
- Backend: `SecurityConfig.java`, `AuthController.java`, `AdminBackupController.java`/`AdminBackupService.java`, `JwtService.java`, `RestExceptionHandler.java`.
- Frontend: `src/modules/api/client.js`, `src/modules/common/ProtectedRoute.jsx`, `src/modules/dashboards/MetricsDashboard.jsx`, `src/modules/common/ThemeContext.jsx`.
- Infra: root `docker-compose.yml`, frontend `nginx/nginx.conf`, `traininginsights-frontend/vite.config.js`.
