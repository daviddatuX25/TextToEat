# php-run-scripts

Run whitelisted Artisan commands when you don’t have SSH (e.g. via hosting panel “Run PHP”).

- **CLI:** From the Laravel app root: `php php-run-scripts/run.php key:generate` (or `storage:link`, `config:cache`, `route:cache`, `migrate`).
- **Panel:** Point “Run PHP” at `php-run-scripts/run.php`; some panels accept a query string like `?cmd=key:generate`.
- **Dev only (browser):** With `APP_ENV` not production, you can call `run.php?cmd=...` in the browser if you relax the app root `.htaccess` locally. In production the app root `.htaccess` denies all (so php-run-scripts is not web-accessible).

See `docs/DEPLOY_BEGINNER_GUIDE.md` § “Running commands without SSH”.
