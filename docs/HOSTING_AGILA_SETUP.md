# Hosting & Agila Setup Guide

This guide covers deploying the Text-to-Eat Laravel app to **Agila** hosting via **FTP**, using **GitHub Actions** for automated deploys, and configuring **Facebook Messenger** and **Textbee SMS** integrations to use your live domain.

---

## 1. Domain & FTP (Agila)

| Item | Value |
|------|--------|
| **Domain** | `www.avelinalacasandile-eat.top` |
| **FTP host** | `ftp.avelinalacasandile-eat.top` |
| **FTP port** | `21` |
| **FTP username** | `avelinht` |
| **FTP password** | Store in GitHub Secrets (see below). **Never** commit or document the real password. |

### 1.1 Document root on Agila

- Point the domain’s **document root** to the Laravel `public` folder.
- Typical options on Agila:
  - **Option A:** Upload the whole Laravel app (e.g. into `public_html` or a subfolder). Then in the hosting panel set “Document root” / “Web root” to that folder’s **`public`** subfolder (e.g. `public_html/public` or `public_html/texttoeat-app/public`).
  - **Option B:** If the panel only allows a single folder (e.g. `public_html`), upload the **contents** of Laravel’s `public` directory into `public_html`, and the rest of the app (app, bootstrap, config, etc.) **one level above** `public_html` if your host supports it. Otherwise use Option A.

Confirm with Agila support which structure they support (e.g. “Laravel in subfolder, document root = `public`”).

### 1.2 `.env` on the server

- Create **one** `.env` file on the server (e.g. under the Laravel app root, same level as `artisan`).
- The GitHub Action does **not** upload `.env` (it’s excluded). So you must create and maintain `.env` manually on the server (or via FTP/SFTP) with production values.
- At minimum set:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://www.avelinalacasandile-eat.top

# DB, etc. — use Agila’s DB host, name, user, password
```

---

## 2. GitHub Actions: deploy one branch via FTP

Deploys run when you push to the branch you choose (e.g. `main` or `production`). The workflow builds the Laravel app and uploads it via FTP.

### 2.1 GitHub Secrets

In the repo: **Settings → Secrets and variables → Actions → New repository secret.** Add:

| Secret name | Value | Notes |
|-------------|--------|--------|
| `FTP_PASSWORD` | Your FTP password | Same as Agila FTP password; never commit it. |
| (optional) `FTP_SERVER_DIR` | e.g. `public_html/` or `htdocs/` | Only if you need a custom remote path. |

Do **not** put the FTP password in the workflow file or any doc in the repo.

### 2.2 Workflow file

The workflow file is:

**`.github/workflows/ftp-deploy.yml`**

It:

- Triggers on push to the branch you set (e.g. `main`).
- Runs `composer install --no-dev` and `npm ci && npm run build` inside `texttoeat-app/`.
- Uploads the contents of `texttoeat-app/` to the FTP server (excluding `node_modules`, `.git`, `.env`, tests, etc.).

### 2.3 Remote path on the server

- In `.github/workflows/ftp-deploy.yml`, the **`server-dir`** (env `FTP_SERVER_DIR`) is the remote directory where the Laravel app will live. Default is `./` (FTP user’s home). If Agila uses a different root (e.g. `public_html/`), edit the workflow:

  ```yaml
  env:
    FTP_SERVER_DIR: public_html/
  ```

  or add a repository secret `FTP_SERVER_DIR` and in the workflow use `server-dir: ${{ secrets.FTP_SERVER_DIR || './' }}` if you prefer to keep it out of the file.
- Ensure the domain’s document root points to this directory’s **`public`** subfolder (see 1.1).

### 2.4 First-time and manual steps

1. Push the branch that triggers the workflow (e.g. `main`).
2. After the first deploy, create/upload `.env` on the server and run (via SSH or a “Run script” in the panel, if available):
   - `php artisan key:generate` (if no `APP_KEY` yet)
   - `php artisan config:cache`
   - `php artisan route:cache`
   - `php artisan storage:link` (if you use storage for uploads)

If Agila doesn’t give SSH, do these via their file manager / “Run PHP” or support.

---

## 3. Facebook Messenger – URLs for your domain

Use these with **Meta for Developers** and your app’s **Messenger** product.

### 3.1 Webhook URL (Callback URL)

Set in **Messenger → Settings → Webhooks**:

```text
https://www.avelinalacasandile-eat.top/api/messenger/webhook
```

- **GET** is used for subscription verification (verify token).
- **POST** is used for incoming messages and postbacks.

### 3.2 `.env` on server (Messenger)

In the server’s `.env`:

```env
APP_URL=https://www.avelinalacasandile-eat.top

FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret
FACEBOOK_VERIFY_TOKEN=your_verify_token
FACEBOOK_PAGE_ACCESS_TOKEN=your_page_access_token
```

`FACEBOOK_VERIFY_TOKEN` must match exactly the “Verify token” you type in the Meta webhook configuration.

### 3.3 Checklist (from FACEBOOK_MESSENGER_INTEGRATION.md)

- Callback URL = `https://www.avelinalacasandile-eat.top/api/messenger/webhook`
- Verify and save (Meta will send a GET to confirm).
- Connect the Page and subscribe events: `messages`, `messaging_postbacks`, etc.
- Page Access Token in `.env` as `FACEBOOK_PAGE_ACCESS_TOKEN`.

---

## 4. SMS – URL for your domain and high-level plan

**SMS – High-level plan:** Inbound is unchanged (gateway app on the phone receives SMS and POSTs to Laravel at `/api/sms/incoming`). Outbound uses **FCM push**: Laravel enqueues outbound SMS and sends a Firebase Cloud Messaging data message to the phone; the Android app sends the SMS via the device SIM and POSTs mark-sent to Laravel. No polling. For full detail see **`docs/SMS_FCM_PUSH_DESIGN.md`** and **`TEXTBEE_SMS_INTEGRATION.md`**.

---

Textbee (or your gateway app) must call your app at a **public HTTPS** URL for **inbound** SMS.

### 4.1 Webhook URL (incoming SMS)

In the Textbee app/dashboard, set the **Webhook URL** to:

```text
https://www.avelinalacasandile-eat.top/api/sms/incoming
```

Your Laravel route is `POST /api/sms/incoming` (see `routes/api.php`).

### 4.2 `.env` on server (SMS)

For **outbound** (FCM), set Firebase credentials. For **inbound**, optional webhook secret. Outbound does not use a gateway API URL.

```env
FIREBASE_CREDENTIALS=/path/to/serviceAccountKey.json
# FCM_DEVICE_TOKEN=   # optional, for testing
TEXTBEE_WEBHOOK_SECRET=optional_if_supported
# TEXTBEE_API_URL=    # optional, only for legacy/health checks; outbound uses FCM
```

The webhook URL in 4.1 is where the gateway app **sends** incoming SMS. The Android app registers its FCM token with Laravel and receives outbound send commands via FCM; it then POSTs to `/api/sms/outbound/mark-sent`. See `docs/SMS_FCM_PUSH_DESIGN.md`.

### 4.3 Testing

- **Inbound:** Send an SMS to the gateway number; confirm the app receives a POST at `/api/sms/incoming` (logs or Telescope).
- **Outbound:** Confirm the chatbot reply is enqueued, FCM is sent, the Android app sends the SMS and calls mark-sent, and the customer receives the SMS.

---

## 5. Quick reference – live URLs

| Purpose | URL |
|--------|-----|
| **App (web)** | `https://www.avelinalacasandile-eat.top` |
| **Messenger webhook (GET + POST)** | `https://www.avelinalacasandile-eat.top/api/messenger/webhook` |
| **SMS webhook – incoming (POST)** | `https://www.avelinalacasandile-eat.top/api/sms/incoming` |
| **SMS device register (POST)** | `https://www.avelinalacasandile-eat.top/api/sms/device/register` |
| **SMS outbound mark-sent (POST)** | `https://www.avelinalacasandile-eat.top/api/sms/outbound/mark-sent` |

---

## 6. Related docs

- **Facebook Messenger:** project root `FACEBOOK_MESSENGER_INTEGRATION.md`
- **SMS FCM push design:** `docs/SMS_FCM_PUSH_DESIGN.md`
- **SMS integration overview:** project root `TEXTBEE_SMS_INTEGRATION.md`
- **Follow-up (env + webhooks):** `docs/sms-fb-integration-follow-up.md`

---

## 7. Security reminder

- **FTP password:** Only in GitHub Secrets (e.g. `FTP_PASSWORD`), never in the repo or this doc.
- **`.env`:** Never committed; create and edit only on the server (or via secure panel).
- **APP_DEBUG:** Must be `false` in production.
