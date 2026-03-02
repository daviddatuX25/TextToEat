# Manual deploy: beginner guide

This guide walks you from “I have the repo” to “app is live with Facebook Messenger webhook, SMS/FCM, and real SIM.” You build the app with Docker (no PHP/Node on your machine), upload via FileZilla, then configure the server and integrations.

For Agila-specific details (FTP host, DB prefix, etc.), see [HOSTING_AGILA_SETUP.md](HOSTING_AGILA_SETUP.md). For a full list of env variables (FB, SMS, FCM, Vite), see `texttoeat-app/.env.prod.example`.

---

## What you’ll need

- **Docker** — to build the app (composer + npm) without installing PHP or Node locally.
- **FileZilla** (or any FTP/SFTP client) — to upload the built app to the server.
- **Agila hosting** — FTP access, MySQL database, PHP. Your domain (e.g. `www.avelinalacasandile-eat.top`) should point to this host.
- **Integrations (when you want them):**
  - **Facebook Messenger:** Meta for Developers account, Facebook App, Messenger product, Page.
  - **SMS / FCM:** Firebase project, service account JSON file, Android device with the companion app.
  - **Real SMS:** A real SIM in the Android device; set `CHANNEL_MODE=prod` on the server.

---

## Using the prod branch (optional)

We keep two branches:

- **master (or main)** — Full repo: docs, `texttoeat-app`, scripts, and everything else. Use this for development and for reading this guide.
- **prod** — Deploy-only subset: only `texttoeat-app/` and `scripts/` (what you need to build and upload). No `docs/` or other non-deploy files.

**If you use the prod branch:** Clone the repo, checkout `prod`, then follow the steps below. Build and upload from `prod` so you only work with deploy-relevant files. The full guide and all docs stay on `master`.

**If you use master:** You can build and deploy from `master` too. The steps are the same; you just have the full repo (including this guide) in the same checkout.

**About `.env.prod`:** The file `.env.prod` is in `.gitignore` on **every** branch. So when you copy `.env.prod.example` to `.env.prod` and fill it with real values, it is never pushed to the remote — not from master, not from prod. You can delete your local `.env.prod` after you’ve built and uploaded (e.g. to avoid leaving secrets on disk), or leave it; it will still never be committed. The template `.env.prod.example` stays in the repo on both branches.

---

## Step 1: Clone and prepare env

1. Clone the repo (and, if you use it, checkout the **prod** branch). Then go into the app folder:
   ```bash
   git clone <repo-url> && cd <repo-name>
   # Optional: git checkout prod
   cd texttoeat-app
   ```

2. Copy the production env template to a local file you will fill. **`.env.prod` is in `.gitignore`**, so it will never be pushed to the remote (on master or prod). You can safely fill it and use it for the build; afterwards you can delete it locally if you want — the example stays in the repo.
   ```bash
   cp .env.prod.example .env.prod
   ```

3. Open `.env.prod`. **`.env.prod.example` lists every variable** the app needs for production and for the build (app, DB, Vite, Facebook, SMS, FCM, channel mode). Fill them in one place so you don’t have to hunt later. At minimum set:
   - `APP_URL` — your live URL (e.g. `https://www.avelinalacasandile-eat.top`).
   - `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` — from your Agila MySQL (and `DB_HOST` if different).
   - If you use **Pusher:** all `PUSHER_*` and `VITE_PUSHER_*` so the frontend build bakes them in.
   - For **Facebook Messenger:** `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `FACEBOOK_VERIFY_TOKEN`, `FACEBOOK_PAGE_ACCESS_TOKEN`.
   - For **SMS/FCM and real SIM:** `CHANNEL_MODE=prod`, `FIREBASE_CREDENTIALS` (path on server), and optionally `TEXTBEE_*`. The app generates an SMS device API key (QR on Portal → SMS devices); set `SMS_DEVICE_API_KEY` in `.env` only if you want to override it.

   You can leave `APP_KEY` empty; generate it on the server later with `php artisan key:generate`.

---

## Step 2: Build the app with Docker

From the **repo root** (one level above `texttoeat-app`):

```bash
./scripts/build-for-deploy.sh
```

This script:

- Runs `composer install --no-dev --optimize-autoloader` in a Docker container.
- Runs `npm ci && npm run build` in a Node container. If `.env.prod` exists, it is used so Vite gets `VITE_*` (and other) vars.

Optional: create a zip for upload (if your host lets you upload one file and extract):

```bash
./scripts/build-for-deploy.sh --zip
```

That creates `texttoeat-app-deploy.zip` in the repo root (excluding `.env`, `.git`, `node_modules`). Upload the zip and extract on the server, or upload the folder as in Step 3.

---

## Step 3: Upload with FileZilla and set document root

Use **one** of the two layouts below. **Layout A** is the Agila-style setup: `public_html` **is** Laravel’s `public` folder (its contents); `app/`, `vendor/`, etc. are **siblings** of `public_html` in your account home. **Layout B** is for when you prefer (or the panel forces) the whole app inside a subfolder under `public_html`.

**Important:** The document root must always point at the folder that contains only `index.php`, `build/`, etc. — never at the folder that contains `app/`, `vendor/`, or `.env`. Otherwise those could be exposed.

---

### Layout A (recommended): `public_html` = Laravel’s `public`; app is sibling

On the server, **`public_html`** holds only what’s inside Laravel’s **`public/`** folder. The rest of the app (`app/`, `bootstrap/`, `vendor/`, `.env`, etc.) lives in the **account home**, as a **sibling** of `public_html`. The web root is `public_html`; the app root is its parent. Laravel’s `index.php` uses `__DIR__.'/../'` to find `vendor` and `bootstrap`, so they must be in that parent folder.

**1. Connect with FileZilla** (host, username, password from Agila).

**2. Go to your account home** (the folder that contains `public_html`). Example:
```text
/home/avelinht/
  public_html/
  (other files if any)
```

**3. Upload Laravel’s `public/` contents into `public_html`.** From your local built app, upload the **contents** of `texttoeat-app/public/` **into** the remote `public_html/` folder. So on the server you have:
```text
/home/avelinht/public_html/
  index.php
  .htaccess
  build/
  (any other files from Laravel’s public/)
```

**4. Upload the rest of the app into the account home** (the **parent** of `public_html` — same level as `public_html`, not inside it). So from your local `texttoeat-app/`, upload **everything except** the `public/` folder into `/home/YOUR_USER/`. Result:
```text
/home/avelinht/
  public_html/        ← index.php, .htaccess, build/ (from step 3)
  app/
  bootstrap/
  config/
  storage/
  vendor/
  .env                ← you create in Step 4 (do not upload)
  artisan
  composer.json
  ...
```

**Do not upload:** `.env`, `.env.prod`, `.git`, `node_modules`, or the **contents** of `public/` into the account home (you already put public’s contents in `public_html`).  
**Do upload:** `app/`, `bootstrap/`, `config/`, `storage/`, `vendor/`, `artisan`, `composer.json`, etc. — and in step 3 you already uploaded `public/build/` inside `public_html`.

**5. (Layout A only) Symlink `public` to `public_html`** so Laravel finds the web root (e.g. for `php artisan storage:link` and asset URLs). From the account home, run once (via SSH or panel):
```bash
cd /home/YOUR_USER
ln -s public_html public
```
Replace `YOUR_USER` with your Agila username. Now `public` points to `public_html` and Laravel’s `public_path()` will resolve correctly.

**6. Set the domain’s document root** to `public_html` (often the default). In the panel, it should be:
```text
/home/YOUR_USER/public_html
```
No change needed if the panel already uses `public_html` as the web root. The server serves only what’s in `public_html`; `app/`, `vendor/`, and `.env` are one level up and not web-accessible.

---

### Layout B: Whole app inside a subfolder under `public_html`

If you prefer to keep the app in one place under `public_html`, put the full app in a subfolder and point the document root at that subfolder’s `public` folder.

**1. Connect with FileZilla** and go into `public_html`.

**2. Create a subfolder**, e.g. `app` or `texttoeat-app`:
```text
/home/avelinht/public_html/
  app/              ← create this folder
```

**3. Upload the full built app** (contents of local `texttoeat-app/`) **into** `public_html/app/`. On the server:
```text
/home/avelinht/public_html/app/
  app/
  bootstrap/
  config/
  public/          ← index.php, .htaccess, build/, etc.
  storage/
  vendor/
  .env             ← you create in Step 4 (do not upload)
  artisan
  ...
```

**Do not upload:** `.env`, `.env.prod`, `.git`, `node_modules`.  
**Do upload:** `vendor/`, `public/build/`, and all other Laravel files.

**4. Set the domain’s document root** to that subfolder’s `public` folder. In the panel:
```text
/home/YOUR_USER/public_html/app/public
```
The server will only serve files inside `public`; `.env` and source code are not reachable.

---

### Copy-paste checklist (either layout)

- [ ] FileZilla: connect to Agila (host, user, password).
- [ ] **Layout A:** Upload contents of local `texttoeat-app/public/` into remote `public_html/`. Upload everything else from `texttoeat-app/` (except `public/`) into the account home (parent of `public_html`). Then run `ln -s public_html public` from the account home. **Layout B:** Upload full `texttoeat-app/` contents into `public_html/app/`.
- [ ] Do **not** upload: `.env`, `.env.prod`, `.git`, `node_modules`.
- [ ] Confirm `vendor/` and (for Layout A) `public_html/build/` or (for Layout B) `public_html/app/public/build/` are present.
- [ ] Document root: **Layout A** = `.../public_html`; **Layout B** = `.../public_html/app/public`.
- [ ] Create `.env` on the server in the app root (Step 4).

**Why Layout A?** `public_html` is the only web root; `app/`, `vendor/`, and `.env` are siblings of `public_html` in the account home, so they are never served. Layout B is also safe as long as the document root is the `public` subfolder.

**Paths quick reference (replace `YOUR_USER` with your Agila username):**

| What | Layout A | Layout B |
|------|----------|----------|
| Document root | `/home/YOUR_USER/public_html` | `/home/YOUR_USER/public_html/app/public` |
| App root (where `.env` and `artisan` live) | `/home/YOUR_USER` (account home) | `/home/YOUR_USER/public_html/app` |

---

## Step 4: .env on the server

1. Create a file named `.env` **in the Laravel app root** (the folder that contains `artisan`, `app/`, `vendor/`, `public/`). Do **not** upload your local `.env.prod` file (never send secrets over FTP). Create `.env` on the server and paste in the values — you can reuse what you put in `.env.prod` in Step 1.

   **Where exactly (copy-paste reference):**
   - **Layout A:** `.env` goes in the **account home** (same folder as `artisan`, `app/`, `vendor/`): `/home/YOUR_USER/.env`
   - **Layout B:** `.env` goes in: `/home/YOUR_USER/public_html/app/.env` (same folder as `artisan`).

2. Use `texttoeat-app/.env.prod.example` as the checklist; it has every variable. Set at least:
   - `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL=` your live URL
   - Database: `DB_*`
   - `APP_KEY` — generate on the server (see below).

3. If the host gives you SSH or a “Run PHP” / “Run script” option, run these from the **app root** (same folder as `artisan`). Copy-paste (replace `YOUR_USER` with your Agila account name):
   - **Layout A** (app root = account home):
   ```bash
   cd /home/YOUR_USER
   php artisan key:generate
   php artisan config:cache
   php artisan route:cache
   php artisan storage:link
   php artisan migrate
   ```
   - **Layout B** (app root = public_html/app):
   ```bash
   cd /home/YOUR_USER/public_html/app
   php artisan key:generate
   php artisan config:cache
   php artisan route:cache
   php artisan storage:link
   php artisan migrate
   ```
   If there is no SSH, use the **php-run-scripts** helper (see below) or the panel’s “Run PHP” / “Run script” from the app root.

---

### Running commands without SSH: php-run-scripts

The app includes a folder **`php-run-scripts/`** (sibling to `app/`, `vendor/`, `.env`). Use it when you cannot run `php artisan` in a terminal.

- **From the panel:** Point “Run PHP” (or equivalent) at **`php-run-scripts/run.php`** and pass the command, e.g. `run.php?cmd=key:generate` or run via CLI: `php php-run-scripts/run.php key:generate` from the app root.
- **Allowed commands:** `key:generate`, `storage:link`, `config:cache`, `route:cache`, `migrate` (migrate gets `--force` automatically).

**Security (dev vs production):**

- **.env** stays in the app root (same folder as `app/`, `vendor/`, `php-run-scripts/`). That’s the “higher level” env for the app; create it on the server and never upload it.
- **App root `.htaccess`** (the only `.htaccess` outside `public/`) denies all web access to the folder that contains `.env`, `vendor/`, and `php-run-scripts/`. With document root set to `public/`, the server never serves that folder anyway; the deny is a safety net.
- **In production**, `run.php` also refuses to run when called via the web (e.g. from a browser); it only runs when invoked from the command line or your panel’s “Run PHP” (which often runs as CLI). So production stays strict.
- **In dev** (`APP_ENV=local` or similar), you can run the scripts via browser (e.g. `run.php?cmd=storage:link`) if you relax the app root `.htaccess` locally; in production leave the root `.htaccess` in place (deny all).

---

## Step 5: Register Facebook Messenger webhook

1. In [Meta for Developers](https://developers.facebook.com/), open your app → **Messenger** → **Webhooks**.

2. Set **Callback URL** to:
   ```text
   https://YOUR_DOMAIN/api/messenger/webhook
   ```
   (Replace `YOUR_DOMAIN` with your real domain, e.g. `www.avelinalacasandile-eat.top`.)

3. Set **Verify token** to any string you choose — and set the **same** value in the server `.env` as `FACEBOOK_VERIFY_TOKEN`.

4. In the server `.env`, set:
   - `FACEBOOK_APP_ID`
   - `FACEBOOK_APP_SECRET`
   - `FACEBOOK_VERIFY_TOKEN` (must match the one in Meta)
   - `FACEBOOK_PAGE_ACCESS_TOKEN`

5. In Meta, subscribe to the webhook for **messages**, **messaging_postbacks**, and any other events you need. Connect your Facebook Page to the app if you haven’t already.

See `texttoeat-app/.env.prod.example` for the full list of Facebook vars and project root `FACEBOOK_MESSENGER_INTEGRATION.md` for a detailed checklist.

---

## Step 6: SMS and FCM (real SIM)

1. **Channel mode:** In the server `.env`, set:
   ```env
   CHANNEL_MODE=prod
   ```
   `prod` = real SMS and Messenger. `sim` = simulator only (no real sends).

2. **Firebase:** Upload your Firebase service account JSON to the server (e.g. in `storage/` or a path outside the web root). Set in `.env`:
   ```env
   FIREBASE_CREDENTIALS=/full/path/to/serviceAccountKey.json
   ```

3. **Optional:** Set `SMS_DEVICE_API_KEY` only if you want to override the app-generated key (otherwise the QR on Portal → SMS devices uses the stored key). Set `TEXTBEE_API_URL`, `TEXTBEE_WEBHOOK_SECRET` if you use them. See `.env.prod.example` and [HOSTING_AGILA_SETUP.md](HOSTING_AGILA_SETUP.md) §6.

4. **Inbound SMS webhook:** If your gateway (e.g. Textbee) supports a webhook URL, set it to:
   ```text
   https://YOUR_DOMAIN/api/sms/incoming
   ```

5. **Real SIM:** Put a real SIM in the Android device that runs the companion app. With `CHANNEL_MODE=prod`, outbound SMS are sent via FCM to that device, and the app sends them over the SIM.

---

## Step 7: Quick reference URLs

Replace `YOUR_DOMAIN` with your actual domain (e.g. `www.avelinalacasandile-eat.top`).

| Purpose | URL |
|--------|-----|
| **App (web)** | `https://YOUR_DOMAIN` |
| **Messenger webhook (GET + POST)** | `https://YOUR_DOMAIN/api/messenger/webhook` |
| **SMS webhook – incoming (POST)** | `https://YOUR_DOMAIN/api/sms/incoming` |
| **SMS device register (POST)** | `https://YOUR_DOMAIN/api/sms/device/register` |
| **SMS outbound mark-sent (POST)** | `https://YOUR_DOMAIN/api/sms/outbound/mark-sent` |

---

## Troubleshooting

- **Webhook verification fails (Facebook):**  
  Check that `APP_URL` and the callback URL match, that `FACEBOOK_VERIFY_TOKEN` in `.env` exactly matches the “Verify token” in Meta, and that the route is reachable from the internet (no firewall blocking Meta).

- **No realtime updates on staff pages:**  
  If you use Pusher, ensure `VITE_PUSHER_APP_KEY` and `VITE_PUSHER_APP_CLUSTER` were set in `.env.prod` (or in env when running the build script) so they were baked into the frontend. On the server, set `BROADCAST_CONNECTION=pusher` and all `PUSHER_*` vars. If you don’t use Pusher, set `BROADCAST_CONNECTION=null`; the app will fall back to 30s polling.

- **SMS not sending:**  
  Confirm `CHANNEL_MODE=prod`, `FIREBASE_CREDENTIALS` points to the uploaded JSON file, and the Android app has registered its FCM token with your Laravel app (device register URL above).

- **Build script fails:**  
  Ensure Docker is running and you run the script from the repo root. If composer or npm fail, check that `texttoeat-app/composer.json` and `package.json` exist and that you have enough disk space.

---

## Related docs

- [HOSTING_AGILA_SETUP.md](HOSTING_AGILA_SETUP.md) — Agila FTP, build options, server `.env`, Pusher, FB and SMS URLs.
- `texttoeat-app/.env.prod.example` — Full env checklist (app, DB, Vite, FB, SMS, FCM, channel mode).
- Project root: `FACEBOOK_MESSENGER_INTEGRATION.md`, `TEXTBEE_SMS_INTEGRATION.md` — Integration details.
