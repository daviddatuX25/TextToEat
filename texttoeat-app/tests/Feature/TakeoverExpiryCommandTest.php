<?php

namespace Tests\Feature;

use App\Models\ChatbotSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class TakeoverExpiryCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_expires_old_takeover_sessions_and_restores_bot_mode(): void
    {
        config()->set('chatbot.takeover_timeout_minutes', 1);

        $session = ChatbotSession::create([
            'channel' => 'sms',
            'external_id' => '09129998888',
            'language' => 'en',
            'state' => ['current_state' => 'human_takeover', 'automation_disabled' => true],
            'last_activity_at' => now()->subMinutes(5),
        ]);

        Artisan::call('chatbot:expire-takeover-sessions');

        $session->refresh();
        $this->assertSame('main_menu', $session->state['current_state'] ?? null);
        $this->assertFalse((bool) ($session->state['automation_disabled'] ?? true));
    }
}

