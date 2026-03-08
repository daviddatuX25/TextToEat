# php-run-scripts

Small helper scripts you can run from:

- **CLI** (if you have it), or  
- Your hosting panel’s **“Run PHP” / cron** (no SSH required).

They all live in `php-run-scripts/` and assume you run them from the **Laravel app root**:

```bash
cd /path/to/laravel-app      # folder with artisan, app/, vendor/
php php-run-scripts/initial-setup.php
```

In production they are meant to run as **console** scripts, not from the browser.

---

## Quick cheat sheet

- **First time on a new server:**  
  `php php-run-scripts/initial-setup.php`

- **After you upload a new build / pull new code:**  
  `php php-run-scripts/deploy-update.php`

- **Reset + reseed (dev/staging ONLY):**  
  `php php-run-scripts/reseed.php`

- **Run one specific command (advanced):**  
  `php php-run-scripts/run.php migrate`  
  `php php-run-scripts/run.php key:generate`  
  …etc.

---

## Scripts

### `initial-setup.php` – first-time setup

Run **once** after a fresh deploy, once `.env` is in place.

Does, in order:

1. `key:generate`
2. `storage:link`
3. `migrate --force`
4. `config:cache`
5. `route:cache`

```bash
php php-run-scripts/initial-setup.php
```

---

### `deploy-update.php` – after code updates

Run whenever you deploy **new code** to an existing site.

Does:

1. `migrate --force`
2. `config:cache`
3. `route:cache`

```bash
php php-run-scripts/deploy-update.php
```

---

### `reseed.php` – wipe & reseed DB (dev only)

Runs:

```bash
php artisan migrate:fresh --seed --force
```

Effects:

- **Drops all tables**, re-runs migrations, then seeders.
- Refuses to run when `APP_ENV=production`.

Use only on **local/dev/staging**:

```bash
php php-run-scripts/reseed.php
```

---

### `run.php` – run one allowed Artisan command

Wrapper around a short allow-list:

- `key:generate`
- `storage:link`
- `config:cache`
- `route:cache`
- `migrate` (adds `--force` automatically)

Examples:

```bash
php php-run-scripts/run.php key:generate
php php-run-scripts/run.php storage:link
php php-run-scripts/run.php migrate
```

Some panels let you pass a query string when calling `run.php` (e.g. `?cmd=key:generate`); check your host’s docs. The shared bootstrap blocks pure web access in production.

---

### `bootstrap.php` – internal bootstrap

Used by all the scripts above. It:

- Finds the app root (one level above `php-run-scripts/`)
- Loads Composer autoload
- Boots Laravel’s console kernel
- In production, stops execution if called via the web (non-CLI)

You don’t call this one directly.

---

For how this fits the full deploy story (build script, `public_html` layout, etc.), see `docs/DEPLOY_BEGINNER_GUIDE.md` → “Running commands without SSH”.
