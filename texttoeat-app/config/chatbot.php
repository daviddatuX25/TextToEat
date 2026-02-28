<?php

return [
    'session_timeout_seconds' => (int) env('CHATBOT_SESSION_TIMEOUT_SECONDS', 60),
    'takeover_timeout_minutes' => (int) env('CHATBOT_TAKEOVER_TIMEOUT_MINUTES', 60),
];
