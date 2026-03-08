# php-run-scripts

Helper scripts you can run from **CLI** or your hosting panel’s **“Run PHP”** (no SSH required). They live in `php-run-scripts/` and assume the **Laravel app root** is the parent of this folder (same folder as `artisan`, `app/`, `vendor/`).

---

## Run via dispatcher (recommended)

Use **`run.php`** with a script name:

```bash
cd /path/to/laravel-app
php php-run-scripts/run.php initial-setup
php php-run-scripts/run.php deploy-update
php php-run-scripts/run.php menu-reset
php php-run-scripts/run.php schedule-cron-info
```

From the panel: point “Run PHP” at `php-run-scripts/run.php` and pass the script name as argument (e.g. `deploy-update`). In production, `run.php` requires `RUN_SCRIPTS_PASSWORD` in `.env` when invoked via the web.

---

## Scripts

| Script | Purpose |
|--------|--------|
| **initial-setup** | One-time: `key:generate`, `storage:link`, `migrate --force`, `config:cache`, `route:cache`. |
| **deploy-update** | After code deploy: `migrate --force`, `config:cache`, `route:cache`. |
| **reseed** | Dev/staging: `migrate:fresh --seed`. Refuses in production. |
| **force-reseed** | Wipes DB and reseeds. Production only if `ALLOW_FORCE_RESEED=true` in `.env`. |
| **menu-reset** | Runs `menu:reset-today --force` (rollover + reset). You can also use Portal → Menu settings → “Reset menu now”. |
| **schedule-cron-info** | Prints the one cron line to add so Laravel’s scheduler runs (auto menu reset, SMS timeout, chatbot takeover expiry). No side effects. |

---

## Laravel scheduler (cron)

Scheduled tasks (menu reset at a set hour, SMS pending timeout, chatbot takeover expiry) only run if the Laravel scheduler is triggered every minute. Add **one** cron job on the server:

```bash
* * * * * cd /path/to/your/app/root && php artisan schedule:run >> /dev/null 2>&1
```

Replace `/path/to/your/app/root` with your app root (e.g. `/home/YOUR_USER` for Layout A, or `/home/YOUR_USER/public_html/app` for Layout B). Run **schedule-cron-info** to print the exact line for your deploy path.

On **Hestia**, use the full path to PHP and to `artisan` (e.g. `/usr/bin/php8.2 /home/USER/web/DOMAIN/public_html/artisan schedule:run >> /dev/null 2>&1`). **schedule-cron-info** prints a Hestia-ready line when run on the server.

---

## Standalone scripts (alternative)

You can also run these directly (same app root):

- `php php-run-scripts/initial-setup.php` — first-time setup
- `php php-run-scripts/deploy-update.php` — after deploy
- `php php-run-scripts/reseed.php` — dev only: migrate:fresh --seed

For the full deploy story (build, upload, `.env`, scheduler cron), see `docs/DEPLOY_BEGINNER_GUIDE.md`.
