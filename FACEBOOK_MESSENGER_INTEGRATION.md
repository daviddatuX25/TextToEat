Facebook Messenger Integration for Laravel Chatbot - Complete Setup Guide
============================================================================

## Overview

You are integrating your Laravel chatbot with Facebook Messenger so customers can message your business Facebook Page and your chatbot responds automatically.

## Architecture Flow

Customer messages your Facebook Page  
         ↓  
Facebook Messenger receives message  
         ↓  
Facebook sends webhook to your Laravel app  
         ↓  
Laravel chatbot processes message  
         ↓  
Laravel sends response back via Messenger API  
         ↓  
Response appears in customer's chat on Facebook

## Step 1: Configure Webhooks (CRITICAL)

### What is a Webhook?

A webhook is a URL on your Laravel app where Facebook will send customer messages in real-time. Your app listens at this URL and responds.

### What You Need to Do:

#### A. Create a Webhook Endpoint in Laravel

In your Laravel app, create a route that accepts POST requests from Facebook:

- Route: `POST /webhook/messenger`  
  or  
- Route: `POST /api/messenger/webhook`

This endpoint should:

- Accept incoming JSON data from Facebook  
- Verify it's actually from Facebook (using verify token)  
- Parse the message  
- Process it with your chatbot logic  
- Send a response back to the user

#### B. Fill in Meta Developer Dashboard:

- **Callback URL**: This is the public URL to your webhook endpoint  
  - Example: `https://yourdomain.com/webhook/messenger`  
  - Must be HTTPS (Facebook requires secure connection)  
  - Must be publicly accessible (not localhost)

- **Verify Token**: A secret string you create  
  - You choose this (e.g., `my_secret_verify_token_12345`)  
  - You'll use it in your Laravel code to verify requests are from Facebook  
  - Keep it secret – only you and Facebook know it

#### C. Click "Verify and save"

Facebook will send a test request to your webhook URL to confirm it works.

## Step 2: Generate Access Tokens (CRITICAL)

### What is an Access Token?

An access token is like a password that allows your Laravel app to send messages on behalf of your Facebook Page. Facebook uses it to verify you have permission.

### What You Need to Do:

#### A. Connect Your Facebook Page

- Click the "Connect" button in section 2  
- Select your business Facebook Page  
- This creates the connection between your app and page

#### B. You'll receive:

- **Page Access Token**: A long string that your Laravel app uses to send messages  
  - Store this securely in your `.env` file: `FACEBOOK_PAGE_ACCESS_TOKEN=xxx`  
  - Never share or commit this to public repos

## Step 3: Complete App Review (For Production)

This is needed when you go live. During development/testing, you can skip this.

## Implementation Checklist for Your Laravel App

### Environment Setup (`.env`)

```env
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret
FACEBOOK_PAGE_ACCESS_TOKEN=your_page_access_token
FACEBOOK_VERIFY_TOKEN=my_secret_verify_token_12345
WEBHOOK_URL=https://yourdomain.com/webhook/messenger
```

### 1. Webhook Verification Endpoint

Create a route that handles Facebook's verification request:

```php
Route::get('/webhook/messenger', function (Request $request) {
    $token = $request->query('hub_verify_token');
    $challenge = $request->query('hub_challenge');
    
    if ($token === env('FACEBOOK_VERIFY_TOKEN')) {
        return response($challenge, 200);
    }
    
    return response('Forbidden', 403);
});
```

### 2. Message Receiving Endpoint

Create a route that receives and processes messages:

```php
Route::post('/webhook/messenger', function (Request $request) {
    $data = $request->json()->all();
    
    // Verify the request is from Facebook
    // Extract message from data
    // Pass to your chatbot logic
    // Return 200 OK to Facebook
    
    return response('ok', 200);
});
```

### 3. Message Sending Function

Create a helper function to send messages back:

```php
function sendMessengerMessage($recipientId, $message) {
    $url = 'https://graph.facebook.com/v12.0/me/messages';
    
    $payload = [
        'recipient' => ['id' => $recipientId],
        'message' => ['text' => $message],
        'access_token' => env('FACEBOOK_PAGE_ACCESS_TOKEN')
    ];
    
    // Send HTTP POST request to Facebook
    // Handle response
}
```

### 4. Chatbot Logic Integration

- When a message arrives at your webhook, extract the text  
- Pass it to your chatbot core logic  
- Get the response  
- Send it back using the send function above

## Key Concepts to Understand

### Webhook Flow

1. **Event from Facebook**: User sends message to your Page  
2. **Facebook Server**: "I received a message, let me tell the app"  
3. **Your Laravel App**: Receives POST request at webhook URL  
4. **Your Chatbot**: "Let me think about this message"  
5. **Your App**: "Facebook, here's the response"  
6. **Facebook**: Sends response to user

### Access Token Lifecycle

- **Page Access Token**: Never expires (usually)  
- Store securely – treat like a password  
- Use in every API request to Facebook  
- If compromised, regenerate it

### Security Requirements

- Webhook URL must be HTTPS  
- Verify Token verification is mandatory  
- Always validate requests are from Facebook  
- Never expose tokens in frontend code

## Testing Checklist

- Webhook URL is publicly accessible and HTTPS  
- Verify Token is set and matches in Meta Dashboard and `.env`  
- Facebook can verify the webhook (green checkmark in Meta Dashboard)  
- Page Access Token is generated and stored  
- Test sending a message to your Facebook Page  
- Message arrives in Laravel webhook  
- Chatbot processes it  
- Response sends back to Messenger

## Meta Dashboard Settings You Need

From the screenshots you showed:

### Section 1: Configure Webhooks

- **Callback URL**: `https://yourdomain.com/webhook/messenger`  
- **Verify token**: Your secret string  
- **Status**: Should show "Verified" (green)

### Section 2: Generate Access Tokens

- **Connected Pages**: Your Facebook Business Page  
- **Page Access Token**: Will be provided  
- **Webhook Subscriptions**: Enable for the page

### Section 3: Complete App Review

- For development: Not needed yet  
- For production: Required to send messages to users outside test mode

## Common Issues & Solutions

**"Webhook verification failed"**

- Verify token in code doesn't match Meta Dashboard  
- Webhook URL not publicly accessible  
- Webhook not responding with challenge code

**"No FB pages yet"**

- You haven't connected your Facebook Page yet  
- Click Connect button in section 2

**"Messages not sending"**

- Invalid Page Access Token  
- User hasn't messaged your page yet (need opt-in)  
- API endpoint URL wrong

## Next Steps for Your Builder Agent

- Create webhook routes in Laravel  
- Store all tokens in `.env` securely  
- Implement message receive/send logic  
- Test webhook verification with Meta  
- Test end-to-end message flow  
- Connect your chatbot logic to process messages

This is your complete context to brief your builder agent!

