<?php

return [
    'credentials' => env('FIREBASE_CREDENTIALS'),
    'device_token' => env('FCM_DEVICE_TOKEN'),
    'sms_device_api_key' => env('SMS_DEVICE_API_KEY'),
    'pending_timeout_minutes' => (int) env('SMS_PENDING_TIMEOUT_MINUTES', 10),
    'heartbeat_interval_minutes' => (int) env('SMS_HEARTBEAT_INTERVAL_MINUTES', 15),
];
