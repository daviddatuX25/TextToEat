# SMS: FCM Push Option – Detailed Design

This document is the canonical specification for the **FCM push-based outbound SMS** flow. Inbound SMS (receive) is unchanged: the gateway app on the phone receives SMS and POSTs to Laravel. For sending, Laravel no longer calls the phone; it enqueues outbound SMS and sends a Firebase Cloud Messaging (FCM) data message to the phone. The Android app receives the FCM message, sends the SMS via the device SIM, then calls Laravel to mark the message sent or failed. No polling, no Pi, no tunnel.

---

## 1. High-level idea

- **Receive SMS**: Unchanged. Your existing gateway app (e.g. Textbee/SMSGate) on the phone receives SMS and POSTs to Laravel (`/api/sms/incoming`). Phone = receiver.
- **Send SMS**: Laravel doesn’t call the phone. When there’s an outbound SMS, Laravel sends a Firebase Cloud Messaging (FCM) data message to the phone. Your Android app receives it, sends the SMS with the device SIM, then calls Laravel to mark it sent/failed. No polling – the phone only acts when FCM delivers a message.

---

## 2. End-to-end flow (step by step)

### Outbound SMS (Laravel → phone → carrier)

1. Chatbot (or any code) decides to send SMS to `09123456789` with body "Your order is ready."
2. Laravel enqueues the message (e.g. inserts into `outbound_sms` with `status = pending`) and gets the row id.
3. Laravel loads the device FCM token (the token your Android app previously sent and you stored).
4. Laravel calls Firebase Admin API (from PHP) to send one data message to that token. Payload is something like:
   ```json
   { "id": "123", "to": "09123456789", "body": "Your order is ready." }
   ```
5. FCM delivers the message to the phone (even if app is in background; Android can wake the app).
6. Your Android app’s FCM handler runs. It reads `id`, `to`, `body`, uses `SmsManager` (or default SMS app) to send the SMS, then:
   - **On success**: POST to Laravel e.g. mark-sent with `id` and `status=sent`.
   - **On failure**: same with `status=failed` and a short reason.
7. Laravel updates the row (`sent_at` or `failure_reason`) so it’s not sent again.

### Inbound SMS (carrier → phone → Laravel)

Unchanged: gateway app on the same phone receives the SMS and POSTs to `https://yourdomain.com/api/sms/incoming` with `from`, `message`, etc. Laravel processes and may enqueue a reply, which triggers the outbound flow above.

**Summary**: Receive = existing webhook; Send = enqueue + FCM data message → app sends SMS → app reports back. No polling.

---

## 3. Components and who does what

| Component | Role |
|-----------|------|
| **Firebase project** | Provides FCM: you create a project, get config for the app and a server key / service account for Laravel. Free. |
| **Laravel (Agila)** | Enqueues outbound SMS; stores one (or more) FCM device token(s); when a message is enqueued, calls Firebase Admin API to send a data message with `id`, `to`, `body`; exposes a small API for the app (register token, mark-sent). |
| **Your Android app** | Registers for FCM, gets the token, sends token to Laravel; handles FCM data messages, sends SMS, calls Laravel to mark sent/failed; can also be the same app that receives SMS and POSTs to Laravel if you merge receive + send in one app. |
| **FCM** | Google’s service that delivers the data message to the device. You don’t host it. |

No Pi, no tunnel, no polling. Only “extra” is Firebase (free) and this one Android app.

---

## 4. Firebase setup (one-time)

1. Go to [Firebase Console](https://console.firebase.google.com/), create a project (e.g. “TextToEat SMS”).
2. Add an Android app to the project: package name (e.g. `com.you.texttoeat.smsgateway`), optionally SHA-1 for debug. Download `google-services.json` and put it in the Android project.
3. In **Project settings → Cloud Messaging**: note the Server key (legacy) or, better, use **Service account**: **Project settings → Service accounts → Generate new private key**. You’ll use this in Laravel so it can send messages “as” your project.
4. Enable Firebase Cloud Messaging (FCM) for the project; no billing needed for normal usage.

**Result**: (1) Android app can get an FCM token and receive messages. (2) Laravel can authenticate with Firebase and send data messages to that token.

---

## 5. Laravel side (Agila) – in detail

### 5.1 Dependencies and config

- Install a PHP package that talks to Firebase, e.g. **kreait/firebase-php** (`composer require kreait/firebase-php`). It uses the service account JSON you downloaded.
- In `.env`: path to that JSON or its contents (e.g. `FIREBASE_CREDENTIALS=/path/to/serviceAccountKey.json`). Don’t commit the JSON; put it on the server and point Laravel to it.
- Optional: `FCM_DEVICE_TOKEN=` if you want to hardcode one token for testing; normally the token comes from the app and is stored in DB.

### 5.2 Storage for outbound SMS and token

**Table `outbound_sms`** (or similar):

- `id`, `to` (varchar), `body` (text), `status` (`pending` | `sent` | `failed`), `created_at`, `sent_at` (nullable), `failure_reason` (nullable), optional `channel`/`session_id` for your chatbot.

**Table or cache for FCM token**: e.g. `sms_devices`: `id`, `device_token` (text, unique), `name` (optional), `last_used_at`, `created_at`. Or a single row in a settings table / cache key if you only have one phone. The app will send the token to Laravel; Laravel stores it and uses it when sending FCM.

### 5.3 When “send SMS” is requested

Where you currently call `TextbeeGatewayService::sendSms($phone, $reply)` (e.g. in `TextbeeSmsWebhookController` or after chatbot reply), instead:

1. Insert into `outbound_sms` with `to = $phone`, `body = $reply`, `status = pending`.
2. Get the new `id`.
3. Load the FCM device token from DB/cache.
4. Call Firebase (via kreait/firebase-php) to send a **data-only** message to that token. Payload must include at least: `id` (outbound_sms id), `to`, `body`. No notification title/body needed (so the app can handle it silently).
5. If FCM returns “invalid token” or “not registered”, clear that token in DB and optionally log so you can re-register the device.

### 5.4 API for the Android app

**Register token (and optionally unregister)**

- `POST /api/sms/device/register`
- Body: `{ "token": "<fcm_device_token>", "name": "My Phone" }` (name optional).
- Auth: e.g. Bearer token or API key (e.g. `SMS_DEVICE_TOKEN` in `.env`) so only your app can register.
- Laravel: store/update the token (and set `last_used_at`), return 200.

**Mark outbound SMS as sent or failed**

- `POST /api/sms/outbound/mark-sent`
- Body: `{ "id": 123, "status": "sent" }` or `{ "id": 123, "status": "failed", "reason": "no_service" }`.
- Auth: same as above.
- Laravel: find row by `id`, if still `pending` set `status`, `sent_at` (if sent), `failure_reason` (if failed), save. Return 200.
- Optional: accept an array of `{ id, status, reason? }` to mark multiple in one request (e.g. if you batch in the app later).

### 5.5 FCM payload shape (Laravel → phone)

Send a **data message** (no notification block so the app can process in background without showing a notification). Data payload example:

```json
{
  "id": "123",
  "to": "09123456789",
  "body": "Your order is ready."
}
```

- `id`: string representation of `outbound_sms.id` (so the app can report back).
- `to`: destination number.
- `body`: full message text. If you split long messages into multiple segments in Laravel, send one FCM message per segment (each with its own `outbound_sms` row and `id`), or one FCM with an array of segments – your choice; keep the contract consistent with the app.

### 5.6 Retries and failures

- If Laravel fails to send the FCM message (network, invalid token), keep the row as `pending` and optionally increment a `retry_count`; you can later add a cron that retries or alerts.
- If the app reports `failed`, Laravel marks the row failed and can optionally re-queue (e.g. `retry_count < 3` → set back to `pending`) or leave it for manual inspection.
- If the app never calls mark-sent (app killed, no network), the row stays `pending`; you can have a cron that marks very old pending as failed or retries FCM once.

---

## 6. Android app – in detail

### 6.1 FCM and token

- Add Firebase BoM and `firebase-messaging` to the app. Put `google-services.json` in the project.
- In Application or a launcher Activity: request the FCM token with `FirebaseMessaging.getInstance().getToken()`, then POST it to Laravel `POST /api/sms/device/register` with your auth header. Do this on first run and whenever the token might change (e.g. after reinstall); you can also call `getToken()` periodically and update Laravel if it changes.

### 6.2 Handling incoming FCM (send-SMS command)

- Implement a `FirebaseMessagingService` subclass. Override `onMessageReceived(RemoteMessage remoteMessage)`.
- In `onMessageReceived`, read the data map: `id`, `to`, `body`. Do **not** rely on `remoteMessage.getNotification()` for the send command; use only **data** so it works when the app is in background.
- Parse `id` (e.g. to int/long). Use Android `SmsManager` (or the default SMS app APIs you prefer) to send one SMS to `to` with text `body`. Handle multi-part if body is long (e.g. split by 160 chars and send as multipart).
- According to result:
  - **Success**: POST `/api/sms/outbound/mark-sent` with `{ "id": <id>, "status": "sent" }`.
  - **Failure** (e.g. SmsManager exception, no service): same with `status: "failed"` and a short reason.
- Use the same auth header as for register. Do the HTTP call in a worker/thread/coroutine so you don’t block the FCM handler.

### 6.3 Permissions and behavior

- Request `SEND_SMS` (and `RECEIVE_SMS` if this app will also receive and forward to Laravel). For Android 10+, consider `READ_PHONE_STATE` only if you need it for carrier detection; avoid if not.
- So that FCM can wake the app in background, follow current FCM best practices: don’t force the app to be killed by battery optimization; optionally show a low-priority foreground notification when handling send (to satisfy Android’s background limits), or rely on high-priority data messages if you don’t need a visible notification.

### 6.4 Optional: receive SMS in the same app

If you want one app to both receive and send: register a `BroadcastReceiver` for `SMS_RECEIVED`, read sender and body, then POST to `https://yourdomain.com/api/sms/incoming` with `from`, `message`, etc. Then you don’t need a separate gateway app for receive; same app does receive (POST to Laravel) and send (FCM → send SMS → mark-sent).

---

## 7. Data flow summary

```
[Chatbot wants to send SMS]
        ↓
Laravel: insert outbound_sms (pending), get id
        ↓
Laravel: load FCM token → call Firebase Admin API (data: id, to, body)
        ↓
FCM delivers to device
        ↓
App: onMessageReceived → SmsManager.send(to, body) → POST mark-sent(id, sent|failed)
        ↓
Laravel: update outbound_sms (sent_at or failure_reason)
```

No polling; the phone only reacts when FCM delivers a message. Receive path is unchanged (phone → webhook).

---

## 8. Edge cases and robustness

| Case | Handling |
|------|----------|
| **Token expired or invalid** | When Laravel gets an error from FCM (e.g. “unregistered”), remove that token. App will get a new token on next launch and re-register. |
| **App never reports back** | Row stays `pending`. Add a cron or scheduled job that marks rows older than e.g. 5 minutes as failed or retries FCM once. |
| **Multiple devices** | Store multiple tokens in `sms_devices`; when enqueueing, pick one (e.g. “primary” or round-robin). Each FCM message still carries one `id` for one outbound row. |
| **Offline** | FCM may queue the message and deliver when the device is back online. App sends SMS when it receives the message; if the device was offline for long, you might still want the “old pending” cron above. |
| **Very long message** | Either Laravel splits into multiple `outbound_sms` rows (one FCM per segment) or sends one FCM with multiple parts; app sends multipart SMS. Agree on one approach so Laravel and app stay in sync. |

---

## 9. What you need to build

| Part | What to do |
|------|------------|
| **Firebase** | Create project, add Android app, get `google-services.json`, generate service account JSON for Laravel. |
| **Laravel** | Table for outbound queue; table/cache for FCM token; `POST /api/sms/device/register` and `POST /api/sms/outbound/mark-sent`; when enqueueing, call Firebase to send data message; replace direct `TextbeeGatewayService::sendSms` with enqueue + FCM send. |
| **Android** | App with FCM, send token to Laravel, handle data message → send SMS → mark-sent; optionally receive SMS and POST to `/api/sms/incoming`. |

This is the “better option” spelled out: push (FCM) instead of polling, so you can use your phone for both receiving and sending without polling and without a Pi or tunnel.

---

## References

- **High-level SMS integration**: project root `TEXTBEE_SMS_INTEGRATION.md`
- **Setup and env**: `docs/sms-fb-integration-follow-up.md`
- **Laravel config**: `texttoeat-app/config/textbee.php` (and new Firebase config when implemented)
