<?php

use App\Http\Controllers\ChatbotWebhookController;
use App\Http\Controllers\FacebookMessengerWebhookController;
use App\Http\Controllers\SmsDeviceController;
use App\Http\Controllers\TextbeeSmsWebhookController;
use Illuminate\Support\Facades\Route;

Route::get('/chatbot/init', [ChatbotWebhookController::class, 'init']);
Route::post('/chatbot/webhook', [ChatbotWebhookController::class, 'webhook']);

Route::get('/messenger/webhook', [FacebookMessengerWebhookController::class, 'verify']);
Route::post('/messenger/webhook', [FacebookMessengerWebhookController::class, 'handle']);

Route::post('/sms/incoming', [TextbeeSmsWebhookController::class, 'handle']);

Route::middleware('sms.device.api')->group(function (): void {
    Route::post('/sms/device/register', [SmsDeviceController::class, 'register']);
    Route::put('/sms/device/{deviceId}', [SmsDeviceController::class, 'update']);
    Route::post('/sms/device/{deviceId}/heartbeat', [SmsDeviceController::class, 'heartbeat']);
    Route::post('/sms/device/{deviceId}/sms/status', [SmsDeviceController::class, 'smsStatus']);
    Route::post('/sms/outbound/mark-sent', [SmsDeviceController::class, 'markSent']);
});
