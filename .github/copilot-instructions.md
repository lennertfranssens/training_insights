## Training Insights – Agent Quickstart
Concise, project-specific rules so AI changes stay aligned. Cite files when giving guidance.

### 1. Architecture
- Monorepo: Spring Boot backend (`traininginsights-backend`) + React/Vite frontend (`traininginsights-frontend`).
- All API endpoints live under `/api/*`; frontend always calls relative like `/api/xyz` (never hardcode hostnames).
- Auth: stateless JWT (HS256) minted in `AuthController` (`/api/auth/signin`). Roles: `ROLE_ATHLETE|ROLE_TRAINER|ROLE_ADMIN|ROLE_SUPERADMIN`.
- Public self‑signup removed; users provisioned by privileged roles. Inactive users must activate before signin succeeds.

### 2. Run / Build
- Docker compose (root `docker-compose.yml`) spins up Postgres + backend:8080 + frontend:3000 (Swagger at `/swagger-ui.html`).
- Local dev: backend `mvn spring-boot:run`; frontend `npm install && npm run dev` (proxy handles `/api`).
- Key env vars: `DB_*`, `TI_JWT_SECRET` (raw or Base64), `APP_UPLOADS_DIR` (persist volume), `VAPID_PUBLIC/PRIVATE` (push), SMTP fields on Club entities (not global env).

### 3. Backend Conventions
- Security config: `SecurityConfig.java` permits only `/api/auth/**`, docs, health; everything else JWT. Use method security (`@PreAuthorize`) for role gating where needed.
- Token flows: activation + password reset via time‑limited tokens in `AuthController` (`/activate`, `/password-reset/*`, `/resend-activation`). Always return 200 for reset request to avoid enumeration.
- Data export/import: backup endpoints (see UI + `AdminBackupService`) produce JSON or ZIP (includes `uploads/`). Preserve IDs when importing.
- Push & email: `PushService` uses VAPID keys; emails sent per Club SMTP; notification channel (in‑app/email/both) chosen at send time.
- Migrations: Flyway in `src/main/resources/db/migration`; Hibernate `ddl-auto=update` only for dev convenience.

### 4. Frontend Conventions
- API client: `src/modules/api/client.js` injects `Authorization` header from `localStorage.ti_auth.token`; clears & redirects on 401.
- Protected routing: `ProtectedRoute.jsx` enforces role presence; dashboards chosen in `App.jsx` based on roles.
- Persisted UI prefs/localStorage keys: `ti_auth`, `ti_theme_mode` (system/light/dark), `ti_metrics_club`, others may follow same `ti_*` pattern.
- Date & pickers: use helpers in `common/dateUtils.js` + `BelgianPickers.jsx` (Belgian `dd/MM/yyyy`, 24h time).
- Theme: `ThemeContext.jsx` resolves system mode dynamically; prefer using its provider instead of manual MUI theme instantiation.

### 5. Adding / Modifying Endpoints
- Place controller under `com.traininginsights.controller`, annotate `@RestController @RequestMapping("/api/<area>")`.
- Secure by default (no extra permitAll unless absolutely required). Return consistent error shapes via exceptions handled in `RestExceptionHandler`.
- Include role array claim (`roles`) if issuing custom tokens (mirror `AuthController`).

### 6. Notifications & Emails
- Bulk club/group emails use BCC (privacy/perf). If Club lacks SMTP config, silently fallback to in‑app/push only.
- Summary email (to sender) lists counts + truncated body when email channel used.

### 7. Backups & Uploads
- Backups: JSON (data only) or ZIP (data + `uploads/`). Ensure `APP_UPLOADS_DIR` volume mounted so restores are meaningful.
- Upload paths validated to stay under base uploads dir; do not construct absolute paths manually—use existing services.

### 8. Common Pitfalls
- Forgetting `/api` prefix -> 404 (frontend proxy expects it).
- Hardcoding full URLs -> breaks Docker/Nginx setup; always relative.
- Not persisting uploads volume -> attachments vanish on container rebuild.
- Returning sensitive info on password reset/activation errors; keep messages generic.

### 9. Reference Files
Backend: `SecurityConfig.java`, `AuthController.java`, `AdminBackupService.java`, `JwtService.java`.
Frontend: `src/modules/api/client.js`, `ThemeContext.jsx`, `MetricsDashboard.jsx`, `ProtectedRoute.jsx`.
Infra: root `docker-compose.yml`, frontend `nginx/nginx.conf`.

Keep answers concrete: cite paths, show diff-style changes, and follow these patterns instead of introducing new libraries unless justified.
