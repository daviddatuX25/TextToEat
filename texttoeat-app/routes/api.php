<?php

use App\Http\Controllers\ChatbotWebhookController;
use Illuminate\Support\Facades\Route;

Route::get('/chatbot/init', [ChatbotWebhookController::class, 'init']);
Route::post('/chatbot/webhook', [ChatbotWebhookController::class, 'webhook']);
