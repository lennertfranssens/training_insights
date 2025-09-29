# TrainingInsights Frontend

React + Vite app styled with Material UI (Material Design 2.0 vibe). Served via NGINX, which also reverse-proxies `/api` to the backend.

## Development
- Start backend (see backend README).
- Install & run:
```
npm install
npm run dev
```
Dev server proxies `/api` to `http://localhost:8080`.

## Build & Run with Docker
```
docker compose up --build
```
- App: http://localhost:3000
- Nginx proxies `/api` -> backend at `http://backend:8080` (compose service).

## Role-Based Dashboards
- Super Admin: manage clubs & admins.
- Admin: manage trainers & athletes.
- Trainer: manage groups, athletes, trainings, questionnaires, analytics.
- Athlete: calendar of trainings, pending questionnaires, daily check-in.
