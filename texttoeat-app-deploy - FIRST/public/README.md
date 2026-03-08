# Public web root (Laravel `public/`)

This folder is the **web-facing document root** for the app:

- In local dev it is the `public/` folder of the Laravel project.
- In production (Layout A in `docs/DEPLOY_BEGINNER_GUIDE.md`) its **contents** are uploaded into your hosting account’s `public_html/` (or equivalent web root).

## What belongs here

- `index.php` (Laravel front controller)
- `.htaccess` (rewrites all non-static requests to `index.php`)
- Built frontend assets:
  - `public/build/` from Vite
  - Any other static assets you intentionally expose

## What should **not** be here

Never put these files or folders inside `public/` / `public_html/`:

- `.env` or any `*.env` files
- `app/`, `bootstrap/`, `config/`, `database/`, `resources/`, `routes/`, `storage/`, `vendor/`
- `php-run-scripts/` or any other internal scripts

Those live in the **app root** (one level above `public_html/` in Layout A), so they are not directly reachable from the web.

For full deployment layout and safety notes, see:

- `docs/DEPLOY_BEGINNER_GUIDE.md`
- `texttoeat-app/.htaccess` (app-root deny-all)

