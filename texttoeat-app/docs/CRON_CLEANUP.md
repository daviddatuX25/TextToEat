# Cron cleanup – menu resetting every minute

If your **menu resets every minute**, a cron job is probably running the menu reset script every minute instead of (or in addition to) Laravel’s scheduler.

## 1. List your crons

**SSH (your user):**
```bash
crontab -l
```

**System / deploy user (if different):**
```bash
crontab -u YOUR_USER -l
```

**Hosting panel:**  
Hestia / cPanel / Plesk → **Cron Jobs** and check every entry.

## 2. What to remove

Remove any cron that runs **every minute** (`* * * * *`) and does one of:

- `run.php menu-reset`
- `artisan menu:reset-today`
- `menu-reset` (script name)

Example of a **wrong** cron (causes reset every minute):
```text
* * * * * cd /path/to/app && php php-run-scripts/run.php menu-reset
* * * * * cd /path/to/app && php artisan menu:reset-today
```

Delete that entire line from crontab or remove that cron job in the panel.

## 3. What to keep (one scheduler cron only)

You should have **exactly one** cron that runs every minute and only runs Laravel’s scheduler:

```text
* * * * * cd /path/to/your/app/root && php artisan schedule:run >> /dev/null 2>&1
```

(On Hestia, use the full PHP path, e.g. `/usr/bin/php8.2`.)

That cron does **not** run the menu reset every minute. It runs the scheduler every minute; the scheduler then runs `menu:reset-today` only **once per day** at the hour you set, and only if “Enable automatic reset” is on in Portal → Menu settings.

## 4. Disable automatic menu reset (optional)

To stop automatic daily reset entirely (even at the set hour):

- Go to **Portal → Menu → Settings**.
- Uncheck **“Enable automatic reset at the set hour”**.

## 5. Edit crontab (SSH)

```bash
crontab -e
```

Delete the line that runs `menu-reset` or `menu:reset-today` every minute. Save and exit. No need to restart anything.
