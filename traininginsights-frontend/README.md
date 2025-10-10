# TrainingInsights Frontend

React + Vite app styled with Material UI (Material Design 2.0 vibe). Served via NGINX, which also reverse-proxies `/api` to the backend.

## Development
- Start backend (see backend README).
- Install & run:
```
npm install
npm run dev

## Web Push on iOS

iOS supports web push from iOS 16.4+, but with these requirements:

- The app must be installed to the Home Screen (PWA). Open the site in Safari, tap Share, then "Add to Home Screen".
- Open the app from the Home Screen. From Settings or Athlete Dashboard, tap "Enable notifications" to request permission and register the push subscription.
- Make sure a manifest is linked and a service worker is registered at the root. This repo includes `public/manifest.json` and `public/service-worker.js`.

Troubleshooting:

- If "Push not supported" appears in Safari, make sure you opened the PWA (standalone) rather than a normal tab, and that you are on iOS 16.4+.
- If permission is blocked, go to iOS Settings > Notifications > TrainingInsights and allow.

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
