<?php

namespace Tests\Feature;

use App\Contracts\MessengerSenderInterface;
use App\Contracts\SmsSenderInterface;
use App\Http\Controllers\ChatbotWebhookController;
use App\Models\ChatbotSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class AutomationDisabledWebhookTest extends TestCase
{
    use RefreshDatabase;

    public function test_sms_incoming_skips_bot_when_automation_disabled(): void
    {
        ChatbotSession::create([
            'channel' => 'sms',
            'external_id' => '09123456789',
            'language' => 'en',
            'state' => ['current_state' => 'human_takeover', 'automation_disabled' => true],
            'last_activity_at' => now()->subMinute(),
        ]);

        $smsMock = Mockery::mock(SmsSenderInterface::class);
        $smsMock->shouldNotReceive('send');
        $this->app->instance(SmsSenderInterface::class, $smsMock);

        $chatbotMock = Mockery::mock(ChatbotWebhookController::class);
        $chatbotMock->shouldNotReceive('webhook');
        $this->app->instance(ChatbotWebhookController::class, $chatbotMock);

        $this->postJson('/api/sms/incoming', [
            'from' => '09123456789',
            'message' => 'Hello?',
        ])
            ->assertStatus(200)
            ->assertJsonPath('skipped', 'automation_disabled');

        $session = ChatbotSession::where('channel', 'sms')->where('external_id', '09123456789')->first();
        $this->assertNotNull($session);
        $this->assertDatabaseHas('inbound_messages', [
            'chatbot_session_id' => $session->id,
            'body' => 'Hello?',
        ]);
    }

    public function test_messenger_webhook_skips_bot_when_automation_disabled(): void
    {
        $secret = 'test_app_secret';
        config()->set('facebook.app_secret', $secret);

        ChatbotSession::create([
            'channel' => 'messenger',
            'external_id' => 'psid-999',
            'language' => 'en',
            'state' => ['current_state' => 'human_takeover', 'automation_disabled' => true],
            'last_activity_at' => now()->subMinute(),
        ]);

        $fbMock = Mockery::mock(MessengerSenderInterface::class);
        $fbMock->shouldNotReceive('send');
        $this->app->instance(MessengerSenderInterface::class, $fbMock);

        $chatbotMock = Mockery::mock(ChatbotWebhookController::class);
        $chatbotMock->shouldNotReceive('webhook');
        $this->app->instance(ChatbotWebhookController::class, $chatbotMock);

        $payload = [
            'object' => 'page',
            'entry' => [
                [
                    'messaging' => [
                        [
                            'sender' => ['id' => 'psid-999'],
                            'message' => ['text' => 'Hi'],
                        ],
                    ],
                ],
            ],
        ];

        $raw = json_encode($payload, JSON_UNESCAPED_SLASHES);
        $sig = 'sha256=' . hash_hmac('sha256', $raw, $secret);

        $this->call(
            'POST',
            '/api/messenger/webhook',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_X_HUB_SIGNATURE_256' => $sig,
            ],
            $raw
        )
            ->assertStatus(200)
            ->assertJsonPath('status', 'ok');

        $session = ChatbotSession::where('channel', 'messenger')->where('external_id', 'psid-999')->first();
        $this->assertNotNull($session);
        $this->assertDatabaseHas('inbound_messages', [
            'chatbot_session_id' => $session->id,
            'body' => 'Hi',
        ]);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }
}

