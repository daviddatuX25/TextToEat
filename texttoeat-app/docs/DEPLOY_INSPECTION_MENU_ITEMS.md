# Deploy inspection: why menu items can disappear

This doc summarizes what was inspected in **this copy** (what you deploy online) and what can cause menu items to be deleted after deploy.

---

## 1. What the deploy does (GitHub Actions FTP)

**File:** `.github/workflows/ftp-deploy.yml`

- On push to `main`: checkout → `composer install --no-dev` → `npm ci && npm run build` → **FTP upload** of `texttoeat-app/` to the server.
- **No PHP script runs after deploy.** The workflow does **not** call `run.php`, `deploy-update`, `reseed`, or any Artisan command.
- **Excluded from upload:** `.env`, `.env.*`, `node_modules`, `tests`, `storage/logs/*`, `storage/framework/cache/data/*`, etc. So the server keeps its own `.env` (and thus DB credentials).

So: **the pipeline itself never runs migrate:fresh or reseed.** If menu items disappear, it’s due to something else (see below).

---

## 2. What can wipe or replace menu data

### A) Running **reseed** or **force-reseed** (most likely)

- **reseed** → runs `migrate:fresh --seed`. Drops all tables, re-runs migrations, then runs seeders. All existing menu items are gone; only what `FilipinoMealsSeeder` creates for **today** remains.
- **reseed** is blocked when `APP_ENV=production`. If your server has `APP_ENV=local` or `APP_ENV=staging`, then running **reseed** (via the form or CLI) **will** wipe the DB.
- **force-reseed** → same as reseed but allowed in production **only** if `ALLOW_FORCE_RESEED=true` in `.env`. If that’s set and someone runs force-reseed, the DB is wiped.

**Where reseed can be triggered:**

- **Web form:** `php-run-scripts/run.php` (GET shows form, POST runs the selected script). If you or someone chooses “reseed” or “force-reseed” and submits, that runs.
- **CLI:** `php php-run-scripts/run.php reseed` or `php php-run-scripts/run.php force-reseed`.
- **Direct script:** `php php-run-scripts/reseed.php` (calls `migrate:fresh --seed`; production guard is inside `run_reseed`, so if the host runs `reseed.php` directly, it will refuse in production but run in non-production).

**Action:** After each deploy, run **only** `deploy-update` (via `run.php` or `php php-run-scripts/deploy-update.php`). Never run `reseed` or `force-reseed` on the live DB. Ensure `APP_ENV=production` on the server so reseed is blocked.

---

### B) Running **initial-setup** on an empty DB

- **initial-setup** runs: `key:generate`, `storage:link`, `migrate --force`, `config:cache`, `route:cache`. It does **not** run seeders and does **not** drop tables.
- If you deploy to a **new server** or **new database** and run initial-setup once, you get empty tables (no menu items). That’s expected until you add items via the app or run the seeder separately (and only for dev/staging).

So: if “menu items are gone” happens on a **first deploy to a new environment**, that’s likely initial-setup on an empty DB. For **subsequent** deploys, use **deploy-update** only.

---

### C) Host runs a script after deploy

Some hosts let you set “Run this PHP file after deploy” (e.g. `run.php` or `reseed.php`). If that points to **reseed** or **reseed.php**, every deploy would wipe the DB.

**Action:** In the hosting panel, check for any “post-deploy” or “run PHP” step. It should run **deploy-update** (or only `deploy-update.php`), not reseed.

---

### D) Database not persistent

If each deploy uses a **new** database (e.g. new container, new DB instance, no persistent volume), then after deploy you always have an empty DB. Menu items would “disappear” because the app is talking to a new DB.

**Action:** Confirm the production database is the same across deploys (same DB host/name/user and persistent storage).

---

## 3. Recommended deploy checklist

1. **After FTP deploy:** Run **only** `deploy-update`:
   - Via form: open `run.php`, password, choose **deploy-update**, submit.
   - Via CLI: `php php-run-scripts/run.php deploy-update` or `php php-run-scripts/deploy-update.php`.
2. **Never** run `reseed` or `force-reseed` on production. Don’t set `ALLOW_FORCE_RESEED=true` on production.
3. **Server .env:** Set `APP_ENV=production` so that reseed is refused even if someone selects it.
4. **Hosting:** If you have “run script after deploy”, use **deploy-update** only.
5. **Database:** Use a persistent DB (same connection across deploys).

---

## 4. Script reference (this copy)

| Script            | What it runs                          | Safe for prod? |
|-------------------|----------------------------------------|----------------|
| initial-setup     | key:generate, storage:link, migrate, config/route cache | Yes (one-time on new server) |
| deploy-update     | migrate --force, config:cache, route:cache | **Yes** (use this after each deploy) |
| reseed            | migrate:fresh --seed                   | **No** (blocked if APP_ENV=production) |
| force-reseed      | migrate:fresh --seed                   | **No** (wipes DB; only for disposable envs) |

---

## 5. “Menu gone the next day” (no deletion – by design)

If you can log in, run **migrate** (deploy-update), and after **reseed** you see menu items again, but **the next day** the menu list is empty, that is usually **not** because something deleted rows.

**There is no logic in this codebase that deletes menu items by date or on a schedule.** The only code that deletes `MenuItem` is `MenuItemsController::destroy()` when an admin explicitly removes one item. There is no cron, no scheduled command, and no “clear old menu” logic.

What happens instead:

- The app is built around **“today’s menu” only**. Every place that loads menu items filters by **today**:
  - **Portal (Menu Items page):** `MenuItem::query()->whereDate('menu_date', $today)` (see `MenuItemsController::index`).
  - **Chatbot / customer menu:** `MenuItem::forToday()` → `whereDate('menu_date', today())`.
- When you add an item, it is stored with `menu_date = Carbon::today()` (that day only).
- When the server’s date rolls to the next day, `today()` changes. The query still runs, but now it asks for items where `menu_date = new day`. You have no rows for that day yet, so the list is **empty**. Yesterday’s items are still in the database; they are just never shown because the UI only ever shows **today**.

So “menu gone the next day” is the **intended behavior**: menu is per calendar day, and the next day you need items for that new day (add them or copy from a previous day if you add that feature).

**What to check:**

1. **Timezone**  
   `today()` uses the app timezone (`config('app.timezone')`, default `UTC`). If the server or `.env` does not set `APP_TIMEZONE` (e.g. to `Asia/Manila`), “today” may roll over at the wrong time. Set `APP_TIMEZONE=Asia/Manila` (or your real timezone) in production `.env` so “today” matches your operating day.

2. **Confirm no rows are deleted**  
   In the database, run:  
   `SELECT menu_date, COUNT(*) FROM menu_items GROUP BY menu_date ORDER BY menu_date DESC LIMIT 10;`  
   You should see yesterday’s (and older) dates still with counts; only the **filter** (today) changes.

**Enable/disable (sold out):** The only per-meal “disable” in the app is `is_sold_out`. Staff toggle it in the portal. There is no logic that resets `is_sold_out` (or any enabled state) on a new day—so “new day = empty list” is only because there are no rows for that date, not because items were reset to disabled.

---

*Inspection date: 2025-03; repo copy = deployed app.*
