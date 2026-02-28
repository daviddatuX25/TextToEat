# SMS & Facebook Messenger Integration – Follow-up Setup

Use this doc when you’re ready to connect the Laravel app to real Textbee (SMS) and/or Facebook Messenger. The code is already in place; these steps are for configuration and external setup.

---

## 1. Environment variables

Copy from `.env.example` and fill in the values you get from the steps below.

### SMS (inbound webhook + FCM outbound)

| Variable | Where to get it | Example |
|----------|-----------------|---------|
| `FIREBASE_CREDENTIALS` | Path to Firebase service account JSON (Project settings → Service accounts → Generate new private key). Laravel uses this to send FCM data messages. | `/path/to/serviceAccountKey.json` |
| `FCM_DEVICE_TOKEN` | Optional. Hardcode one FCM token for testing; normally the Android app registers its token via `POST /api/sms/device/register`. | (token string) |
| `TEXTBEE_WEBHOOK_SECRET` | Optional. If your gateway app supports webhook signing for **inbound** SMS, set the same secret here. | `your-webhook-secret` |
| `TEXTBEE_API_URL` | Optional. Only if you still use the gateway’s HTTP API (e.g. health checks). **Outbound send uses FCM**, not this URL. | `http://192.168.1.100:8080` |

### Facebook Messenger

| Variable | Where to get it | Example |
|----------|-----------------|---------|
| `FACEBOOK_APP_ID` | Meta for Developers → Your app → Settings → Basic | Numeric ID |
| `FACEBOOK_APP_SECRET` | Same place (show and copy) | Long string |
| `FACEBOOK_VERIFY_TOKEN` | You choose this; must match what you type in the Meta webhook configuration. | e.g. `my_secret_verify_token_12345` |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | Meta → Your app → Messenger → Settings → Generate token (after connecting a Page) | Long string |

Add to `.env` (never commit real values):

```env
# SMS (FCM outbound + inbound webhook)
FIREBASE_CREDENTIALS=
# FCM_DEVICE_TOKEN=   # optional, for testing
TEXTBEE_WEBHOOK_SECRET=
# TEXTBEE_API_URL=    # optional, only for legacy/health checks

# Facebook Messenger
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
FACEBOOK_VERIFY_TOKEN=
FACEBOOK_PAGE_ACCESS_TOKEN=
```

---

## 2. SMS setup (inbound webhook + FCM outbound)

### 2.1 Android / gateway

1. **Receive**: Install the gateway app (e.g. Textbee) on the Android device for **receiving** SMS and POSTing to Laravel. Insert a SIM with SMS and data/wifi; ensure the phone has internet so it can reach your Laravel webhook URL.
2. **Send**: The same phone (or a dedicated one) runs the app that **sends** SMS via FCM: the app registers its FCM token with Laravel and handles FCM data messages (sends SMS with the device SIM, then POSTs mark-sent). The server does **not** call the phone’s Textbee “send” API; outbound is push-based via FCM.

### 2.2 Laravel

1. Set `FIREBASE_CREDENTIALS` in `.env` to the path of your Firebase service account JSON (e.g. `/path/to/serviceAccountKey.json`). Do not commit the JSON.
2. Optional: `FCM_DEVICE_TOKEN` to hardcode one token for testing; normally the Android app registers via `POST /api/sms/device/register`.
3. Optional: `TEXTBEE_WEBHOOK_SECRET` for inbound webhook signing; `TEXTBEE_API_URL` only if you still use the gateway’s HTTP API (e.g. health checks). Outbound does not use `TEXTBEE_API_URL`.

### 2.3 Webhook URL (inbound, required)

1. Your app must be reachable at a **public HTTPS** URL (e.g. `https://yourdomain.com`). For local dev, use **ngrok** or similar so the gateway app can POST to you.
2. In the gateway app (e.g. Textbee), set the **webhook URL** to:
   ```text
   https://yourdomain.com/api/sms/incoming
   ```
3. If you use a webhook secret, configure it in the app to match `TEXTBEE_WEBHOOK_SECRET`.

### 2.4 Outbound send (FCM)

Laravel does **not** POST to the phone to send SMS. When there is an outbound SMS:

1. Laravel enqueues it (e.g. inserts into `outbound_sms` with status `pending`).
2. Laravel sends an FCM **data** message to the registered device token (payload: `id`, `to`, `body`).
3. The Android app receives the FCM message, sends the SMS via `SmsManager`, then POSTs to Laravel:
   - `POST /api/sms/outbound/mark-sent` with `{ "id": <id>, "status": "sent" }` or `{ "id": <id>, "status": "failed", "reason": "..." }`.

Payload shapes and auth are described in **`docs/SMS_FCM_PUSH_DESIGN.md`**.

### 2.5 Test SMS flow

**Inbound**

1. Send an SMS from another phone to the gateway number.
2. Confirm the Laravel app receives a POST at `/api/sms/incoming` (check logs or Telescope).
3. Confirm the chatbot reply is enqueued and an FCM message is sent; the Android app sends the SMS and calls mark-sent; the customer receives the SMS.

**Outbound**

1. Register the FCM token with Laravel (via the Android app or a manual POST to `POST /api/sms/device/register` with your auth).
2. Trigger an outbound SMS (e.g. send an inbound SMS that triggers a reply). Verify FCM is sent, the app sends the SMS, and mark-sent is called (check `outbound_sms` and logs).

Run the SMS webhook tests:

```bash
./vendor/bin/sail test --filter TextbeeSmsWebhookTest
```

---

## 3. Facebook Messenger setup

For a compact 8-step checklist (callback URL, verify token, events, page, token, test, go live), see **“When you're ready: webhook URL and setup checklist”** in `FACEBOOK_MESSENGER_INTEGRATION.md`.

### 3.1 Meta Developer / App

1. Go to [Meta for Developers](https://developers.facebook.com/) and create or open your app.
2. Add the **Messenger** product to the app.
3. Under **Settings → Basic**, copy **App ID** and **App Secret** → `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` in `.env`.

### 3.2 Webhook (Callback URL)

1. In the app, go to **Messenger → Settings** (or **Webhooks**).
2. **Callback URL**: set to your public HTTPS URL, e.g.  
   ```text
   https://yourdomain.com/api/messenger/webhook
   ```
3. **Verify Token**: type a secret string (e.g. `TEXTTOEAT_TOKEN` or `my_secret_verify_token_12345`). Put the **exact same** string in `.env` as `FACEBOOK_VERIFY_TOKEN`.
4. Click **Verify and save**. Facebook sends a GET with `hub.mode`, `hub.verify_token`, `hub.challenge`; the app returns the challenge as **plain text** (required by Meta; JSON would fail verification).

### 3.3 Page and token

1. Under **Messenger**, connect a **Facebook Page** (the one customers will message).
2. Generate a **Page Access Token** and copy it into `.env` as `FACEBOOK_PAGE_ACCESS_TOKEN`.
3. Subscribe the Page to the webhook. Subscribe these events: **messages**, **messaging_postbacks**, **message_deliveries**, **message_reads**. The app handles messages and postbacks (e.g. button clicks); deliveries and reads are acknowledged with 200.

### 3.4 Local development

- Use **ngrok** (or similar) so your local app is available as `https://xxxx.ngrok.io`.
- Set Callback URL to `https://xxxx.ngrok.io/api/messenger/webhook` and verify.
- Use the same `.env` values; only the public URL changes.

### 3.5 Test Messenger flow

1. Open your Facebook Page and start a conversation (or use the test flow in Meta dashboard).
2. Send a message; confirm the webhook receives the POST and the chatbot replies in Messenger.

Run the Messenger webhook tests:

```bash
./vendor/bin/sail test --filter FacebookMessengerWebhookTest
```

---

## 4. Quick reference – routes

| Channel   | Route                          | Purpose                                |
|----------|---------------------------------|----------------------------------------|
| SMS      | `POST /api/sms/incoming`        | Receive SMS from gateway app           |
| SMS      | `POST /api/sms/device/register` | Register FCM token (Android app)        |
| SMS      | `POST /api/sms/outbound/mark-sent` | Mark outbound SMS sent/failed (Android app) |
| Messenger| `POST /api/messenger/webhook`   | Receive events from Facebook           |
| Messenger| `GET /api/messenger/webhook`    | Webhook subscription verification      |

---

## 5. Troubleshooting

### SMS

- **No reply SMS (outbound)**  
  - Ensure `FIREBASE_CREDENTIALS` is set and Laravel can send FCM.  
  - Confirm at least one FCM token is registered (`POST /api/sms/device/register`).  
  - Check Laravel logs for FCM errors (e.g. invalid/unregistered token).  
  - Verify the Android app receives the FCM data message and calls mark-sent; if the app never reports back, the row stays `pending` (see “App never reports” below).

- **FCM not received on device**  
  - Token may be invalid or expired; re-register from the app.  
  - Check app is not force-stopped; FCM can wake the app in background if configured correctly.

- **App never reports mark-sent**  
  - Device may be offline or app killed; row stays `pending`. Consider a cron to mark very old pending as failed or retry FCM once.  
  - Ensure the app uses the same auth (e.g. API key) for mark-sent as configured in Laravel.

- **Webhook not called (inbound)**  
  - Webhook URL must be **HTTPS** and publicly reachable.  
  - For local dev, use ngrok and point the gateway app to the ngrok URL.

### Messenger

- **“Webhook verification failed”**  
  - Callback URL must be HTTPS and reachable.  
  - `FACEBOOK_VERIFY_TOKEN` must match the Verify Token you typed in Meta exactly. The app returns the challenge as plain text (not JSON); if verification still fails, ensure no middleware or proxy alters the response body.

- **Messages not sending**  
  - Confirm `FACEBOOK_PAGE_ACCESS_TOKEN` is the Page token (not App token).  
  - Ensure the Page is subscribed to the webhook and that you’re messaging that Page.

---

## 6. References

- **SMS FCM push design (outbound)**: `docs/SMS_FCM_PUSH_DESIGN.md` – payloads, APIs, Laravel/Android detail, edge cases.
- **SMS integration overview**: project root `TEXTBEE_SMS_INTEGRATION.md`
- **Messenger spec**: project root `FACEBOOK_MESSENGER_INTEGRATION.md`
- **App config**: `texttoeat-app/config/textbee.php`, `texttoeat-app/config/facebook.php`
