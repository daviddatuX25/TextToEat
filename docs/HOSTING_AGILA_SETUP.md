# Hosting & Agila Setup Guide

This guide covers deploying the Text-to-Eat Laravel app to **Agila** hosting using **FileZilla** (FTP/SFTP) only. No GitHub Actions. You build locally and upload the built app via FileZilla. It also covers configuring **Facebook Messenger** and **Textbee SMS** integrations to use your live domain.

---

## 1. Domain & FTP (Agila)

| Item | Value |
|------|--------|
| **Domain** | `www.avelinalacasandile-eat.top` |
| **FTP host** | `ftp.avelinalacasandile-eat.top` (or your Agila FTP host) |
| **FTP port** | `21` (FTP) or `22` (SFTP if supported) |
| **FTP username** | `avelinht` |
| **FTP password** | Store in a password manager or in FileZilla’s saved site. **Never** commit or document the real password in the repo. |

Use **FileZilla** (or another FTP/SFTP client) to connect and upload files. No automation; you deploy by building locally and uploading.

---

## 2. Build, then upload via FileZilla

You do **not** use GitHub Actions. You either **build on your machine** (PHP + Node) or **build with Docker and export** a folder/archive, then upload the result with FileZilla.

---

### Option A: Build locally (no Docker)

#### 2.1 One-time: prepare build env

On your machine, in the project repo:

- PHP and Composer available (e.g. via Sail, or local PHP).
- Node.js and npm available for the frontend build.

### 2.2 Build steps (before each deploy)

Run these from the **project root** (or from `texttoeat-app/` if your paths differ):

```bash
cd texttoeat-app

# Dependencies (production only)
composer install --no-dev --optimize-autoloader

# Frontend build (uses .env or .env.production for Vite vars)
npm ci
npm run build
```

**Optional – production Vite/Pusher vars:**  
If you use Pusher in production, set these **before** `npm run build` (e.g. in `.env.production` or export in the shell):

- `VITE_BROADCAST_BROADCASTER=pusher`
- `VITE_PUSHER_APP_KEY=your_key`
- `VITE_PUSHER_APP_CLUSTER=ap1` (or your cluster)

If these are not set, the production build will not include Echo; staff pages will use the 30s polling fallback.

---

### Option B: Build with Docker, then export for FTP

You can use **Docker** (e.g. Sail) only to build the app; the server does **not** need Docker. Docker produces a built app; you export that as a folder (or zip) and upload it with FileZilla.

1. **Build inside Docker**  
   From the project root, use Sail (or a PHP + Node image) to run the same build steps inside a container:
   - `composer install --no-dev --optimize-autoloader`
   - `npm ci` and `npm run build`  
   (e.g. `./vendor/bin/sail shell` then run those in `texttoeat-app/`, or run a one-off container that mounts the repo and runs the commands.)

2. **Export the result**  
   After the build, the built app is in `texttoeat-app/` (including `vendor/` and `public/build/`). Copy that directory out of the container if needed (e.g. `docker cp <container>:/var/www/html/texttoeat-app ./deploy-build`), or use a bind mount so the built files are already on your host.

3. **Optional: zip for upload**  
   From the repo, run `./scripts/build-for-deploy.sh` to produce a timestamped folder under `deploy-builds/`. Upload that folder’s contents with FileZilla (or zip it yourself if your workflow prefers a single archive).

4. **Upload via FileZilla**  
   Upload the exported folder (or its contents) to the remote app root. Same rules as below: exclude `.env`, `.git`, `node_modules`; include `vendor/`, `public/build/`, and all app files.

**Vite/Pusher:** If you need production Pusher in the frontend build, set `VITE_BROADCAST_BROADCASTER`, `VITE_PUSHER_APP_KEY`, and `VITE_PUSHER_APP_CLUSTER` in the environment where `npm run build` runs inside Docker (e.g. an `.env.production` in the mounted app dir or env vars passed into the container).

---

### 2.3 What to upload with FileZilla

- **Upload the whole `texttoeat-app/` folder** (after the build above) into the remote directory that will be the Laravel app root (e.g. `public_html/` or `htdocs/` — confirm with Agila).
- **Do NOT upload:**
  - `.env` (you create and edit this only on the server)
  - `.git/`
  - `node_modules/`
  - `storage/logs/*` (optional; can leave empty or omit)
  - `vendor/` is **needed** (you built it with `composer install --no-dev`; upload it)

So: upload everything in `texttoeat-app/` **except** `.env`, `.git`, and `node_modules`. Include `vendor/`, `public/build/` (from `npm run build`), and all Laravel app files.

### 2.4 Remote directory layout

- Put the Laravel app (the contents you upload) in the path Agila expects (e.g. `public_html/` or a subfolder like `public_html/texttoeat-app/`).
- Point the domain’s **document root** to the Laravel **`public`** folder:
  - Example: if the app is in `public_html/texttoeat-app/`, set document root to `public_html/texttoeat-app/public`.

If the panel only allows one folder (e.g. `public_html`), either:
- Put the app in a subfolder and set document root to that subfolder’s `public`, or  
- Upload the contents of `public/` into `public_html/` and the rest of the app one level above, if Agila supports that (confirm with support).

---

## 3. `.env` on the server

- Create **one** `.env` file on the server at the Laravel app root (same level as `artisan`).
- **Do not** upload `.env` from your machine. Create or edit it on the server (via FileZilla or the hosting file manager).
- Use **`texttoeat-app/env.production.example`** as a template; copy it to the server as `.env` and fill in production values.

Minimum:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://www.avelinalacasandile-eat.top

# DB — use Agila’s DB host, name, user, password
```

### 3.1 First-time setup on the server

After the first upload, run these on the server (via SSH, or “Run script” / “PHP” in the panel if Agila provides it):

```bash
php artisan key:generate    # if APP_KEY is not set
php artisan config:cache
php artisan route:cache
php artisan storage:link   # if you use storage for uploads
```

If there is no SSH, use the panel’s file manager or ask Agila how to run these commands.

---

## 4. Realtime – Pusher

Both local dev and production can use **Pusher**. When Pusher is not configured (`BROADCAST_CONNECTION=null` or no credentials), staff pages use a 30s polling fallback.

**Server `.env`** (when you want realtime):

```env
BROADCAST_CONNECTION=pusher
PUSHER_APP_ID=your_app_id
PUSHER_APP_KEY=your_app_key
PUSHER_APP_SECRET=your_app_secret
PUSHER_APP_CLUSTER=ap1
```

**Build-time:** Set `VITE_*` vars before `npm run build` (see 2.2). To skip Pusher in prod, set `BROADCAST_CONNECTION=null` on the server; staff pages will use polling.

---

## 5. Facebook Messenger – URLs for your domain

In **Meta for Developers** → your app → **Messenger** → **Webhooks**:

**Callback URL:**

```text
https://www.avelinalacasandile-eat.top/api/messenger/webhook
```

- **GET** = subscription verification (verify token).
- **POST** = incoming messages and postbacks.

**Server `.env`:**

```env
APP_URL=https://www.avelinalacasandile-eat.top

FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret
FACEBOOK_VERIFY_TOKEN=your_verify_token
FACEBOOK_PAGE_ACCESS_TOKEN=your_page_access_token
```

`FACEBOOK_VERIFY_TOKEN` must match the “Verify token” in the Meta webhook configuration. Connect the Page and subscribe to `messages`, `messaging_postbacks`, etc. See **`FACEBOOK_MESSENGER_INTEGRATION.md`** for full checklist.

---

## 6. SMS – URL for your domain and high-level plan

**Inbound:** The gateway app on the phone receives SMS and POSTs to Laravel. **Outbound:** Laravel enqueues SMS and sends an FCM data message to the phone; the Android app sends the SMS via the device SIM and POSTs mark-sent to Laravel. See **`docs/SMS_FCM_PUSH_DESIGN.md`** and **`TEXTBEE_SMS_INTEGRATION.md`**.

### 6.1 Webhook URL (incoming SMS)

In the Textbee app/dashboard, set the **Webhook URL** to:

```text
https://www.avelinalacasandile-eat.top/api/sms/incoming
```

### 6.2 Server `.env` (SMS)

```env
FIREBASE_CREDENTIALS=/path/to/serviceAccountKey.json
TEXTBEE_WEBHOOK_SECRET=optional_if_supported
```

Upload the Firebase service account JSON to the server and set `FIREBASE_CREDENTIALS` to its path. The Android app registers its FCM token and receives outbound send commands via FCM; it POSTs to `/api/sms/outbound/mark-sent`.

---

## 7. Quick reference – live URLs

| Purpose | URL |
|--------|-----|
| **App (web)** | `https://www.avelinalacasandile-eat.top` |
| **Messenger webhook (GET + POST)** | `https://www.avelinalacasandile-eat.top/api/messenger/webhook` |
| **SMS webhook – incoming (POST)** | `https://www.avelinalacasandile-eat.top/api/sms/incoming` |
| **SMS device register (POST)** | `https://www.avelinalacasandile-eat.top/api/sms/device/register` |
| **SMS outbound mark-sent (POST)** | `https://www.avelinalacasandile-eat.top/api/sms/outbound/mark-sent` |

---

## 8. Deployment checklist (FileZilla-only)

1. **Build** (choose one):
   - **Local:** `cd texttoeat-app && composer install --no-dev --optimize-autoloader && npm ci && npm run build`
   - **Docker:** Build inside Sail/container (composer + npm run build), then export the built `texttoeat-app/` folder (or zip it) for upload. See **Option B** in §2.
2. **Connect with FileZilla** using the Agila FTP host, username, and password.
3. **Upload** the contents of `texttoeat-app/` to the remote app root, **excluding** `.env`, `.git`, `node_modules`. Include `vendor/` and `public/build/`.
4. **On the server:** Ensure `.env` exists and is correct; run `php artisan config:cache`, `route:cache`, and `storage:link` if needed.
5. **Confirm** document root points to the `public` folder of the uploaded app.

---

## 9. Database portability (PostgreSQL vs MySQL/MariaDB)

- **Local / Sail:** The app uses **PostgreSQL** (see `compose.yaml`). Run tests and dev against it.
- **Production (Agila):** The server runs **MySQL or MariaDB**. Set `DB_CONNECTION=mysql` in `.env` and use the panel’s DB host, name, user, and password.

The codebase is written to support both engines:

- **JSON columns:** Use Laravel’s JSON path syntax (e.g. `state->current_state`) in queries so the framework can compile the right SQL per driver. Avoid raw Postgres-only operators like `->>` in application code.
- **Case-insensitive search:** Use `App\Support\DatabaseDialect::addCaseInsensitiveLike` / `addCaseInsensitiveLikeOr` instead of `ILIKE` so search works on MySQL/MariaDB as well as PostgreSQL.

**Before deploying:** Run the test suite (e.g. `php artisan test`) with your default test DB. Optionally run again with a MySQL test database to confirm portability (e.g. separate `.env.testing.mysql` and `phpunit.xml` config).

---

## 10. Related docs

- **Facebook Messenger:** project root `FACEBOOK_MESSENGER_INTEGRATION.md`
- **SMS FCM push design:** `docs/SMS_FCM_PUSH_DESIGN.md`
- **SMS integration:** project root `TEXTBEE_SMS_INTEGRATION.md`
- **Follow-up (env + webhooks):** `docs/sms-fb-integration-follow-up.md`

---

## 11. Security reminder

- **FTP password:** Only in FileZilla (or a password manager). Never in the repo or this doc.
- **`.env`:** Never committed; create and edit only on the server (FileZilla or panel).
- **APP_DEBUG:** Must be `false` in production.
