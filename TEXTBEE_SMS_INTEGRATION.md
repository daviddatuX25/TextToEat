SMS INTEGRATION (INBOUND + FCM OUTBOUND) – Developer Context Guide
====================================================================

Outbound SMS uses **FCM push**: Laravel enqueues messages and sends a Firebase Cloud Messaging data message to the phone; the Android app sends the SMS via the device SIM and reports back. No polling, no Pi, no tunnel. For the full FCM push design (payloads, APIs, edge cases), see **`docs/SMS_FCM_PUSH_DESIGN.md`**.

## OVERVIEW

You are integrating an Android SMS gateway with your Laravel chatbot application:

- **Receive**: Gateway app (e.g. Textbee) on the phone receives SMS and POSTs to your Laravel webhook.
- **Send**: Laravel enqueues outbound SMS and sends an FCM data message to the phone; your Android app sends the SMS via the device SIM and POSTs mark-sent/mark-failed to Laravel.

The flow: Customer SMS → Gateway App on Android Phone → Laravel Webhook → Chatbot Logic → Laravel enqueues reply → FCM → App sends SMS → App reports to Laravel.

## ARCHITECTURE

┌─────────────────────────────────────────────────────────────────────────────┐  
│                    SMS ARCHITECTURE (INBOUND + FCM OUTBOUND)                  │  
└─────────────────────────────────────────────────────────────────────────────┘

Customer              Gateway/App on Phone           Laravel Server              FCM
   │                          │                           │                      │
   │──── SMS ───────────>      │                           │                      │
   │                           │── Webhook (incoming) ─────>│                      │
   │                           │   POST /api/sms/incoming   │  (Process Chatbot)   │
   │                           │                           │                      │
   │                           │   Outbound: Laravel enqueues outbound_sms        │
   │                           │   and sends FCM data ──────────────────────────>│
   │                           │<────────────────────────── FCM delivers ─────────│
   │                           │   App: SmsManager.send()   │                      │
   │                           │   App: POST mark-sent ────>│                      │
   │<──── SMS ───────────       │                           │                      │

## GATEWAY / PHONE SETUP

Assumptions:

- Gateway app (e.g. Textbee) installed on Android phone for **receiving** SMS and POSTing to Laravel.
- Same phone (or a dedicated one) runs the app that **sends** SMS: it registers an FCM token with Laravel and handles FCM data messages (send SMS via SIM → mark-sent).
- Phone has SIM card and internet; for production the send-capable phone is typically on and reachable by FCM.

For **inbound only**: configure the gateway app’s webhook URL to your Laravel `/api/sms/incoming`. No Textbee API URL is required for **outbound** (outbound uses FCM). If you keep a legacy Textbee send API (e.g. for health checks), you can set `TEXTBEE_API_URL` in `.env`; see env section below.

## INTEGRATION POINTS

### 1. RECEIVING SMS (Webhook)

Flow:

1. Customer sends SMS to phone number  
2. Textbee receives SMS on Android phone  
3. Textbee forwards to your Laravel webhook URL  
4. Laravel processes and responds

Setup Required:

- Create webhook endpoint in Laravel  
- Configure webhook URL in Textbee app settings  
- Webhook must be public HTTPS URL  
- Example: `https://yourdomain.com/api/sms/incoming`

### 2. SENDING SMS (FCM push)

Flow:

1. Your chatbot (or any code) generates a response and requests “send SMS” to a phone number.
2. Laravel inserts a row into `outbound_sms` (status `pending`) and gets the row id.
3. Laravel loads the FCM device token from storage and calls the Firebase Admin API to send a **data-only** message to that token (payload: `id`, `to`, `body`).
4. FCM delivers the message to the phone; the Android app’s FCM handler runs (even in background).
5. The app sends the SMS via `SmsManager` (device SIM), then POSTs to Laravel `POST /api/sms/outbound/mark-sent` with `id` and `status` (sent or failed).
6. Laravel updates the `outbound_sms` row (`sent_at` or `failure_reason`).

No polling; the phone only acts when FCM delivers a message. See **`docs/SMS_FCM_PUSH_DESIGN.md`** for payload shapes, APIs, and edge cases.

Setup Required:

- Firebase project, Android app with FCM, service account JSON for Laravel.
- Laravel: `outbound_sms` and FCM token storage; Firebase client (e.g. kreait/firebase-php); `POST /api/sms/device/register` and `POST /api/sms/outbound/mark-sent`.
- Android app: FCM token registration, handle data message → send SMS → mark-sent.

## CODE STRUCTURE

Directory Structure:

```text
app/
├── Http/
│   ├── Controllers/
│   │   ├── ChatbotController.php (or TextbeeSmsWebhookController)
│   │   └── SmsDeviceController.php   (register FCM token, optional)
│   ├── Middleware/
│   │   └── VerifyTextbeeWebhook.php
│   └── Requests/
│       └── ReceiveSmsRequest.php
├── Services/
│   ├── ChatbotService.php
│   ├── OutboundSmsService.php       (enqueue + send FCM; replaces direct send)
│   └── TextbeeGatewayService.php    (legacy/inbound only; not used for outbound)
├── Models/
│   ├── ChatMessage.php
│   ├── ChatSession.php
│   ├── OutboundSms.php
│   ├── SmsDevice.php                (FCM token storage)
│   └── SmsLog.php
└── Jobs/
    ├── ProcessSmsMessage.php
    └── MonitorTextbeeHealth.php (optional)

routes/
├── api.php
│   ├── POST /api/sms/incoming        (receive webhook)
│   ├── POST /api/sms/device/register (FCM token registration)
│   └── POST /api/sms/outbound/mark-sent
└── console.php (scheduled tasks)

database/
└── migrations/
    ├── create_chat_messages_table.php
    ├── create_chat_sessions_table.php
    ├── create_outbound_sms_table.php
    ├── create_sms_devices_table.php
    └── create_sms_logs_table.php
```

Outbound send is implemented as: **enqueue** (insert `outbound_sms`) + **send FCM** (Firebase Admin API with data `id`, `to`, `body`). The existing `TextbeeGatewayService::sendSms` is replaced or wrapped by this flow; see `docs/SMS_FCM_PUSH_DESIGN.md` for implementation detail.

## CORE COMPONENTS

### 1. OUTBOUND SMS (FCM) AND LEGACY GATEWAY

**Outbound**: Handled by an outbound queue + FCM + Android app. Laravel does **not** call the phone’s API to send SMS. Instead:

- **OutboundSmsService** (or equivalent): Insert into `outbound_sms`, load FCM token, call Firebase Admin API to send a data message (id, to, body). Expose or use `POST /api/sms/device/register` and `POST /api/sms/outbound/mark-sent` for the app.

**TextbeeGatewayService**: No longer used for **outbound** send. It may remain for legacy or for health checks that hit the phone (if `TEXTBEE_API_URL` is set). All “send SMS” from the chatbot should go through enqueue + FCM send.

### 2. WEBHOOK CONTROLLER

Purpose: Receive incoming SMS from Textbee and process them.  
Responsibilities:

- Receive webhook POST request from Textbee  
- Validate webhook origin (verify it's from Textbee)  
- Extract SMS data (phone, message, timestamp, etc.)  
- Queue message for processing  
- Return 200 OK immediately

Key Methods:

```php
receiveIncomingSms(Request $request): Response
```

Webhook Flow:

- POST request arrives at `/api/sms/incoming`  
- Verify webhook is legitimate (check headers/signature)  
- Extract phone number and message text  
- Store in `ChatMessage` table  
- Queue `ProcessSmsMessage` job  
- Return 200 OK  
- Job processes message in background

### 3. CHATBOT INTEGRATION SERVICE

Purpose: Integrate with your existing chatbot core.  
Responsibilities:

- Take incoming SMS text  
- Pass to chatbot processing logic  
- Get response from chatbot  
- Format response for SMS (160 character limit consideration)  
- Return response text

Key Methods:

```php
processMessage(string $message, array $context): string
handleFallback(string $message): string
```

### 4. DATABASE MODELS

- **ChatMessage Model**:
  - Stores all SMS (incoming and outgoing)  
  - Links to `ChatSession`  
  - Tracks delivery status  
  - Stores original and formatted message

- **ChatSession Model**:
  - Groups related messages into conversations  
  - Tracks user phone number  
  - Stores conversation context  
  - Manages session state

- **SmsLog Model**:
  - Logs all SMS operations  
  - Tracks Textbee API responses  
  - Monitors errors and failures  
  - For analytics and debugging

## API ENDPOINTS REQUIRED

### Incoming SMS Webhook

**POST** `/api/sms/incoming`

Expected Textbee Payload:

```json
{
    "from": "09123456789",
    "message": "Hello chatbot",
    "message_id": "unique_id_123",
    "timestamp": "2024-01-15T10:30:00Z"
}
```

Expected Response:

```json
{
    "success": true,
    "message_id": "unique_id_123"
}
```

HTTP Status: `200`

## DATA FLOW DIAGRAM

┌─────────────────┐  
│  Incoming SMS   │  
│  from Textbee   │  
│  (Webhook POST) │  
└────────┬────────┘  
         │  
         ▼  
┌─────────────────────────────────┐  
│  ChatbotController@incoming     │  
│  - Verify webhook               │  
│  - Extract data                 │  
│  - Create ChatMessage record    │  
└────────┬────────────────────────┘  
         │  
         ▼  
┌─────────────────────────────────┐  
│  Queue ProcessSmsMessage Job    │  
│  (Async processing)             │  
└────────┬────────────────────────┘  
         │  
         ▼  
┌─────────────────────────────────┐  
│  ProcessSmsMessage Job          │  
│  - Parse message                │  
│  - Get chat context/session     │  
└────────┬────────────────────────┘  
         │  
         ▼  
┌─────────────────────────────────┐  
│  ChatbotService@process         │  
│  - Send to chatbot core         │  
│  - Get response                 │  
│  - Handle edge cases            │  
└────────┬────────────────────────┘  
         │  
         ▼  
┌─────────────────────────────────┐  
│  OutboundSmsService (enqueue)    │  
│  - Insert outbound_sms (pending)│  
│  - Load FCM token               │  
│  - Send FCM data message        │  
└────────┬────────────────────────┘  
         │  
         ▼  
┌─────────────────────────────────┐  
│  FCM delivers to device         │  
│  Android app: onMessageReceived │  
│  → SmsManager.send()             │  
│  → POST mark-sent                │  
└────────┬────────────────────────┘  
         │  
         ▼  
┌────────────────────────────────────────────────┐  
│  Customer receives SMS response                │  
└────────────────────────────────────────────────┘

## IMPLEMENTATION CHECKLIST

### Phase 1: Firebase and env

- Create Firebase project; add Android app; get `google-services.json` and service account JSON for Laravel.  
- Add to `.env`: `FIREBASE_CREDENTIALS=/path/to/serviceAccountKey.json`, optional `FCM_DEVICE_TOKEN` for testing.  
- For **inbound**: set webhook URL in gateway app to `https://yourdomain.com/api/sms/incoming`; optionally `TEXTBEE_WEBHOOK_SECRET`.  
- Optional: `TEXTBEE_API_URL` only if you still use it (e.g. health checks or legacy); outbound does not use it.

### Phase 2: Database

- Create migrations for `outbound_sms`, `sms_devices` (FCM token storage), and existing tables (`ChatMessage`, `ChatSession`, `SmsLog` as needed).  
- Run migrations; create models (`OutboundSms`, `SmsDevice`).

### Phase 3: Laravel outbound and FCM

- Install `kreait/firebase-php`; configure Firebase credentials.  
- Implement service that sends FCM data messages (id, to, body).  
- Implement `POST /api/sms/device/register` and `POST /api/sms/outbound/mark-sent` (auth: e.g. API key or Bearer).  
- Where the app currently calls `TextbeeGatewayService::sendSms`, replace with: insert `outbound_sms` → send FCM.

### Phase 4: Webhook (inbound)

- Create webhook endpoint (e.g. `TextbeeSmsWebhookController`); receive at `POST /api/sms/incoming`.  
- Add webhook verification if using secret.  
- Test webhook locally (use ngrok for HTTPS).

### Phase 5: Job processing and chatbot

- Create/use `ProcessSmsMessage` job; connect to chatbot core.  
- Ensure “send reply” path uses enqueue + FCM send (not direct Textbee API).

### Phase 6: Android app

- FCM: get token, POST to `/api/sms/device/register`.  
- Handle FCM data message: read id, to, body; send via SmsManager; POST mark-sent/mark-failed.  
- Optionally: same app receives SMS and POSTs to `/api/sms/incoming`.

### Phase 7: Testing and monitoring

- Unit/integration tests for webhook, register, mark-sent; mock FCM send.  
- End-to-end: trigger outbound SMS → verify FCM sent, app sends SMS, mark-sent called.  
- Logging and optional cron for old pending rows (mark failed or retry FCM).

## KEY CONSIDERATIONS

### 1. Message Length (Character Limit)

- SMS has 160 character limit (160 for ASCII, 70 for Unicode)  
- Your chatbot response might be longer  
- Need to implement message splitting:

Options:

- Option A: Send multiple SMS  
- Option B: Truncate response  
- Option C: Send link to full response

Recommended: Split long messages into multiple SMS (max 160 chars each).

### 2. Phone Number Format

- Accept: `+639123456789`, `09123456789`, `9123456789`  
- Store: normalized format (`09123456789`)  
- Send: use format that works with Philippine carriers

### 3. Session Management

- Each phone number = unique session  
- Track conversation context  
- Store previous messages  
- Allow chatbot to reference conversation history

### 4. Rate Limiting

- Don't spam same phone with too many SMS  
- Implement cooldown between responses  
- Handle rapid incoming SMS from same user

### 5. Error Handling

- FCM invalid/unregistered token → clear token in DB; app re-registers on next launch.  
- App never calls mark-sent → row stays pending; cron to mark old pending as failed or retry FCM.  
- Invalid phone number → handle gracefully.  
- Firebase/network errors → log; optionally retry or alert admin.

### 6. Logging & Monitoring

What to log:

- Every incoming SMS (phone, message, timestamp)  
- Every outgoing SMS (phone, response, status)  
- API calls to Textbee (request, response, duration)  
- Errors and exceptions  
- Gateway health status

Why it matters:

- Troubleshoot issues  
- Analytics (message volume, peak times)  
- Compliance (audit trail)  
- Performance monitoring

## INTEGRATION WITH YOUR EXISTING CHATBOT

Assumption: You have existing `ChatbotService` that processes messages.

Integration Point:

```php
// In ProcessSmsMessage job

public function handle(ChatMessage $message)
{
    // Get your existing chatbot service
    $chatbot = app(ChatbotService::class);
    
    // Get session/context
    $session = ChatSession::where('phone', $message->phone)->first();
    
    // Process message through YOUR chatbot logic
    $response = $chatbot->process(
        $message->content,
        ['session_id' => $session->id]
    );
    
    // Send response via SMS (enqueue + FCM; app sends via SIM and reports mark-sent)
    $outboundSms = app(OutboundSmsService::class);
    $outboundSms->enqueueAndSendFcm($message->phone, $response);
}
```

Your chatbot core stays unchanged – you just feed it messages and get responses back.

## DEPLOYMENT CONSIDERATIONS

### 1. Environment and config

- **Firebase**: Set `FIREBASE_CREDENTIALS` (path to service account JSON) on server; do not commit the JSON. Optional `FCM_DEVICE_TOKEN` for testing.  
- **Inbound**: Webhook URL and optional `TEXTBEE_WEBHOOK_SECRET`. `TEXTBEE_API_URL` only if you still use it (e.g. health checks); outbound does not use it.  
- Development: Test with gateway app and FCM-capable Android app; staging/production: same flow with production Firebase and domain.

### 2. HTTPS Requirement

- Webhook URL must be HTTPS  
- Self-signed cert OK for local testing  
- Production needs valid SSL certificate  
- Textbee validates HTTPS on webhook

### 3. Firewall/Network

- Laravel must reach Firebase (FCM) and be reachable by the Android app (for register and mark-sent).  
- Gateway app (inbound) must reach Laravel webhook URL (public HTTPS).

### 4. Backup/Failover

- Option 1: Have backup SMS provider (Semaphore)  
- Option 2: Store failed messages, retry later  
- Option 3: Multiple Textbee phones for redundancy

## TESTING STRATEGY

### Unit Tests

```php
// Test outbound: enqueue + FCM send (mock Firebase)
test('enqueues outbound SMS and sends FCM', function () {
    $service = app(OutboundSmsService::class);
    $result = $service->enqueueAndSendFcm('09123456789', 'Test message');
    $this->assertDatabaseHas('outbound_sms', ['to' => '09123456789', 'status' => 'pending']);
    // Assert FCM was called with correct data payload
});
```

### Integration Tests

```php
// Test full flow: webhook → processing → response
test('incoming SMS triggers chatbot response', function () {
    $this->postJson('/api/sms/incoming', [
        'from' => '09123456789',
        'message' => 'Hello',
        'message_id' => 'test_123'
    ])->assertStatus(200);
    
    // Verify message was processed
    $this->assertDatabaseHas('chat_messages', [
        'phone' => '09123456789',
        'content' => 'Hello'
    ]);
});
```

### Manual Testing

- Send SMS to phone from real phone  
- Check if webhook receives it  
- Check if chatbot responds  
- Verify response SMS arrives

### Load Testing

- Send 100+ SMS in quick succession  
- Monitor queue performance  
- Check Textbee stability  
- Verify all messages processed

## MONITORING & ALERTS

### Health Checks

- Textbee gateway online/offline  
- API response time  
- Failed SMS count  
- Message queue length

### Metrics to Track

- SMS received per hour  
- SMS sent per hour  
- Response time (SMS received → response sent)  
- Error rate  
- Textbee uptime %

### Alerts

- Textbee offline for >5 minutes  
- Error rate above 5%  
- Response time above 30 seconds  
- Queue backing up (>1000 messages)

## DEPENDENCIES & PACKAGES

Required for FCM outbound:

```bash
composer require kreait/firebase-php   # Firebase Admin API (send FCM data messages)
composer require guzzlehttp/guzzle     # HTTP client (often already present)
```

Optional: `laravel/horizon` for queue monitoring.

Optional but recommended:

```bash
composer require sentry/sentry-laravel  # Error tracking
composer require laravel/telescope      # Debug/monitoring
```

## FILE CHECKLIST FOR DEVELOPER

Must create:

1. `app/Services/OutboundSmsService.php` – Enqueue outbound_sms + send FCM data message  
2. `app/Models/OutboundSms.php`, `app/Models/SmsDevice.php`  
3. Migrations: `outbound_sms`, `sms_devices`  
4. `POST /api/sms/device/register` and `POST /api/sms/outbound/mark-sent` (controller + routes)  
5. Webhook endpoint for inbound (e.g. `TextbeeSmsWebhookController`) and `POST /api/sms/incoming`  
6. Firebase config (credentials path in `.env`); integrate kreait/firebase-php  
7. Replace direct `TextbeeGatewayService::sendSms` calls with enqueue + FCM send  

Nice to have:

8. `app/Jobs/MonitorTextbeeHealth.php` – Health check (if using Textbee API for status)  
9. Tests for webhook, register, mark-sent, and FCM send flow  
10. Cron or job to mark very old pending outbound_sms as failed

## QUICK START (TL;DR)

- **Inbound**: Configure gateway app webhook URL to `https://yourdomain.com/api/sms/incoming`.  
- **Outbound**: Set up Firebase (project, Android app, service account JSON); add `FIREBASE_CREDENTIALS` to `.env`. Create `outbound_sms` and `sms_devices` tables; implement enqueue + FCM send and register/mark-sent API. Android app: FCM token → register; handle FCM data → send SMS → mark-sent.  
- Connect chatbot “send reply” to enqueue + FCM (not direct Textbee API).  
- Test inbound and outbound flows; deploy and monitor.

## SUPPORT & REFERENCE

- **FCM push design (outbound)**: `docs/SMS_FCM_PUSH_DESIGN.md` – payloads, APIs, Laravel/Android detail, edge cases.  
- **Setup and env**: `docs/sms-fb-integration-follow-up.md`  
- Laravel Queue Docs: `laravel.com/docs/queues`  
- Gateway (inbound) docs: e.g. Textbee at `textbee.dev/docs` if using Textbee for receive.

## NOTES FOR DEVELOPER

- Inbound: standard webhook → process → (optional) enqueue reply.  
- Outbound: enqueue in DB + push via FCM; the phone sends the SMS and reports back. No polling.  
- Your chatbot core doesn’t change; only the “send SMS” mechanism changes from “call gateway API” to “enqueue + FCM”.  
- Focus on error handling (invalid token, app never reports back), retries, and monitoring.  
- Full FCM contract: `docs/SMS_FCM_PUSH_DESIGN.md`.

