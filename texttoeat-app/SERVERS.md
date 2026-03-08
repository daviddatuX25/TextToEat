# Dev and prod server scripts

## Frontend (Vite)

Run from `texttoeat-app` (this directory).

| Script | Command | Use |
|--------|---------|-----|
| **Dev** | `npm run dev` or `npm run start:dev` | Start Vite dev server (HMR). Default port 5173. |
| **Dev (no conflict)** | `npm run dev:fresh` | Kill any process on port 5173, then start Vite. Use when 5173 is already in use. |
| **Prod build** | `npm run start:prod` or `npm run build` | Build assets for production (output in `public/build`). |

With **Sail** (recommended):

```bash
# Start containers (PHP, PostgreSQL, etc.)
./vendor/bin/sail up -d

# Dev: run Vite inside Sail (port 5173 forwarded)
./vendor/bin/sail npm run dev

# If port 5173 is in use (e.g. stale Vite), use:
./vendor/bin/sail npm run dev:fresh
```

Without Sail (local Node/PHP):

```bash
npm run dev          # or npm run dev:fresh if 5173 is busy
# In another terminal: php artisan serve
```

## Backend (Laravel)

- **Dev:** `./vendor/bin/sail up` (or `sail up -d` if sail is aliased). App is on `APP_PORT` (default 80).
- **Prod:** Build assets with `sail npm run start:prod`, then serve with your web server (e.g. nginx, Apache, or `php artisan serve` for a quick prod-like check).

## Ports

- **Vite dev:** 5173 (configurable via `VITE_PORT` in `compose.yaml` and `vite.config.js`).
- **Laravel (Sail):** Use **http://localhost:${APP_PORT}** (e.g. **http://localhost:8000** when `APP_PORT=8000` in `.env`). The app listens on `0.0.0.0:80` inside the container; the host port is `APP_PORT`.

## Low-CPU testing (no Vite in Docker)

If Sail + Vite in Docker pushes CPU to 200–300%, run only the backend and use built assets:

```bash
./vendor/bin/sail up -d
./vendor/bin/sail npm run build
# Open http://localhost:8000 (or http://localhost:${APP_PORT})
```

No `sail npm run dev`. For HMR, run `npm run dev` on the host (from `texttoeat-app`) while Sail runs; the page will use `VITE_DEV_SERVER_URL` from `.env`.
