TEXTBEE SMS GATEWAY INTEGRATION WITH LARAVEL CHATBOT - Developer Context Guide
===============================================================================

## OVERVIEW

You are integrating Textbee (an open-source Android SMS gateway) with your Laravel chatbot application. This allows your chatbot to:

- Receive SMS messages from customers  
- Process those messages through your chatbot logic  
- Send back SMS responses

The flow: Customer SMS → Textbee App on Android Phone → Your Laravel Server → Chatbot Logic → Response back to Customer

## ARCHITECTURE

┌─────────────────────────────────────────────────────────────┐  
│                    TEXTBEE ARCHITECTURE                     │  
└─────────────────────────────────────────────────────────────┘

Customer                    Textbee App                 Your Laravel Server  
   │                          │                              │  
   │──── SMS ───────────>      │                              │  
   │                           │── Webhook ────────────>      │  
   │                           │   (incoming SMS)             │  
   │                           │                    (Process   │  
   │                           │                     Chatbot)  │  
   │                           │                              │  
   │                    [Phone API]                           │  
   │                           │<──── REST API Response ───────│  
   │                           │    (send SMS back)            │  
   │<──── SMS ───────────       │                              │  
   │                           │                              │

## TEXTBEE SETUP (ALREADY DONE BY TEAM)

Assumptions:

- Textbee app already installed on Android phone  
- Phone has SIM card and active internet  
- Phone stays on 24/7 (plugged in)  
- Textbee dashboard account created  
- Phone registered in Textbee dashboard

What you (developer) need:

- Textbee API URL (IP and port of phone on local network)

Example: `http://192.168.1.100:8080`

This is the base URL for all API calls to Textbee.

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

### 2. SENDING SMS (API)

Flow:

1. Your chatbot generates response  
2. Laravel calls Textbee API  
3. Textbee sends SMS via phone's SIM card  
4. SMS arrives at customer

Setup Required:

- Create SMS service/class in Laravel  
- Call Textbee API endpoint  
- Handle success/failure responses

## CODE STRUCTURE

Directory Structure:

```text
app/
├── Http/
│   ├── Controllers/
│   │   └── ChatbotController.php
│   ├── Middleware/
│   │   └── VerifyTextbeeWebhook.php
│   └── Requests/
│       └── ReceiveSmsRequest.php
├── Services/
│   ├── SmsService.php
│   ├── ChatbotService.php
│   └── TextbeeGatewayService.php
├── Models/
│   ├── ChatMessage.php
│   ├── ChatSession.php
│   └── SmsLog.php
└── Jobs/
    ├── ProcessSmsMessage.php
    └── MonitorTextbeeHealth.php

routes/
├── api.php (webhook endpoint)
└── console.php (scheduled tasks)

database/
└── migrations/
    ├── create_chat_messages_table.php
    ├── create_chat_sessions_table.php
    └── create_sms_logs_table.php
```

## CORE COMPONENTS

### 1. SMS SERVICE (`TextbeeGatewayService`)

Purpose: Handle all communication with Textbee API.  
Responsibilities:

- Send SMS via Textbee  
- Check gateway health/status  
- Handle API errors gracefully  
- Log all SMS transactions

Key Methods:

```php
sendSms(string $phoneNumber, string $message): array
getGatewayStatus(): bool
getMessageStatus(string $messageId): array
```

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
│  TextbeeGatewayService@send     │  
│  - Format response              │  
│  - Call Textbee API             │  
│  - Log transaction              │  
└────────┬────────────────────────┘  
         │  
         ▼  
┌─────────────────────────────────┐  
│  Textbee API                    │  
│  - Send SMS via Android phone   │  
└────────┬────────────────────────┘  
         │  
         ▼  
┌────────────────────────────────────────────────┐  
│  Customer receives SMS response                │  
└────────────────────────────────────────────────┘

## IMPLEMENTATION CHECKLIST

### Phase 1: Setup

- Get Textbee API URL from team (IP:port)  
- Add to `.env`: `TEXTBEE_API_URL=http://192.168.1.100:8080`  
- Get Textbee webhook URL from team  
- Configure webhook URL in Textbee app settings

### Phase 2: Database

- Create migrations for `ChatMessage`, `ChatSession`, `SmsLog`  
- Run migrations  
- Create models

### Phase 3: SMS Service

- Create `TextbeeGatewayService` class  
- Implement `sendSms()` method  
- Implement `getStatus()` method  
- Add error handling and logging

### Phase 4: Webhook

- Create `ChatbotController`  
- Create `receiveIncomingSms()` endpoint  
- Add webhook verification middleware  
- Test webhook locally (use ngrok for HTTPS)

### Phase 5: Job Processing

- Create `ProcessSmsMessage` job  
- Connect to existing chatbot core  
- Implement message processing logic  
- Add fallback/error handling

### Phase 6: Testing

- Unit tests for SMS service  
- Integration tests for webhook  
- End-to-end SMS flow test  
- Load testing (simulate multiple SMS)

### Phase 7: Monitoring

- Create health check job  
- Set up logging for all SMS  
- Create alerts for gateway offline  
- Dashboard for SMS metrics

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

- Textbee offline → queue for retry  
- Invalid phone number → handle gracefully  
- Network timeout → implement retry logic  
- API errors → log and alert admin

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
    
    // Send response via SMS
    $smsService = app(TextbeeGatewayService::class);
    $smsService->sendSms($message->phone, $response);
}
```

Your chatbot core stays unchanged – you just feed it messages and get responses back.

## DEPLOYMENT CONSIDERATIONS

### 1. Environment

- Development: Test with Textbee on local network  
- Staging: Test with staging Textbee instance  
- Production: Use production Textbee phone

### 2. HTTPS Requirement

- Webhook URL must be HTTPS  
- Self-signed cert OK for local testing  
- Production needs valid SSL certificate  
- Textbee validates HTTPS on webhook

### 3. Firewall/Network

- Ensure Laravel server can reach Textbee API URL  
- Ensure Textbee phone can reach Laravel webhook URL  
- Both on same network OR public HTTPS endpoint

### 4. Backup/Failover

- Option 1: Have backup SMS provider (Semaphore)  
- Option 2: Store failed messages, retry later  
- Option 3: Multiple Textbee phones for redundancy

## TESTING STRATEGY

### Unit Tests

```php
// Test SMS service in isolation
test('can send SMS via Textbee', function () {
    $service = new TextbeeGatewayService();
    $result = $service->sendSms('09123456789', 'Test message');
    $this->assertTrue($result['success']);
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

Required packages:

```bash
composer require guzzlehttp/guzzle
composer require laravel/horizon  # For queue monitoring (optional)
```

Optional but recommended:

```bash
composer require sentry/sentry-laravel  # Error tracking
composer require laravel/telescope      # Debug/monitoring
```

## FILE CHECKLIST FOR DEVELOPER

Must create:

1. `app/Services/TextbeeGatewayService.php` – SMS API client  
2. `app/Http/Controllers/ChatbotController.php` – Webhook endpoint  
3. `app/Http/Middleware/VerifyTextbeeWebhook.php` – Webhook verification  
4. `app/Jobs/ProcessSmsMessage.php` – Background job  
5. `app/Models/ChatMessage.php` – Database model  
6. `database/migrations/*` – Database tables  
7. `routes/api.php` – Add webhook route

Nice to have:

8. `app/Jobs/MonitorTextbeeHealth.php` – Health check job  
9. `app/Http/Controllers/DashboardController.php` – Metrics dashboard  
10. Tests for all components

## QUICK START (TL;DR)

- Get Textbee API URL from team  
- Add to `.env`  
- Create `TextbeeGatewayService`  
- Create webhook endpoint  
- Create job to process messages  
- Connect to your chatbot core  
- Test SMS flow  
- Deploy and monitor

## SUPPORT & REFERENCE

- Textbee Documentation: `textbee.dev/docs`  
- Laravel Queue Docs: `laravel.com/docs/queues`  
- Your Chatbot Core Docs: [Reference your existing chatbot documentation]

## NOTES FOR DEVELOPER

- This is a standard Laravel queue pattern (webhook → queue job → processing)  
- Nothing exotic, standard industry practice  
- Textbee is just another API like any other  
- Your chatbot core doesn't change, just feeds it messages  
- Focus on error handling and monitoring  
- Keep logs clean for debugging

You've got this! 💪

