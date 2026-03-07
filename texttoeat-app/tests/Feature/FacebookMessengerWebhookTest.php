<?php

namespace Tests\Feature;

use App\Models\ChatbotSession;
use App\Messenger\FacebookMessengerClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class FacebookMessengerWebhookTest extends TestCase
{
    use RefreshDatabase;

    public function test_verify_webhook_succeeds_with_valid_token(): void
    {
        config(['facebook.verify_token' => 'test-token']);

        $response = $this->get('/api/messenger/webhook?' . http_build_query([
            'hub_mode' => 'subscribe',
            'hub_verify_token' => 'test-token',
            'hub_challenge' => 'test-challenge',
        ]));

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'text/plain; charset=UTF-8');
        $this->assertSame('test-challenge', $response->getContent());
    }

    public function test_verify_webhook_fails_with_invalid_token(): void
    {
        config(['facebook.verify_token' => 'expected-token']);

        $response = $this->getJson('/api/messenger/webhook?' . http_build_query([
            'hub_mode' => 'subscribe',
            'hub_verify_token' => 'wrong-token',
            'hub_challenge' => 'test-challenge',
        ]));

        $response->assertStatus(403)
            ->assertJson(['error' => 'Invalid verification token']);
    }

    public function test_handle_creates_messenger_session_and_sends_reply(): void
    {
        config(['facebook.app_secret' => 'test-secret']);

        $psid = 'USER_PSID_123';
        $payload = [
            'object' => 'page',
            'entry' => [
                [
                    'id' => 'PAGE_ID',
                    'time' => 1234567890,
                    'messaging' => [
                        [
                            'sender' => ['id' => $psid],
                            'recipient' => ['id' => 'PAGE_ID'],
                            'timestamp' => 1234567891,
                            'message' => [
                                'mid' => 'mid.test',
                                'text' => 'hi',
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $rawBody = json_encode($payload, JSON_THROW_ON_ERROR);
        $signature = 'sha256=' . hash_hmac('sha256', $rawBody, 'test-secret');

        $clientMock = Mockery::mock(FacebookMessengerClient::class);
        $clientMock->shouldReceive('sendTextMessage')->andReturnNull();
        $clientMock->shouldReceive('sendQuickReply')
            ->once()
            ->with(
                $psid,
                Mockery::on(fn ($text): bool => \is_string($text) && str_contains($text, 'language')),
                Mockery::on(fn ($opts): bool => \is_array($opts) && count($opts) === 3)
            );
        $this->app->instance(FacebookMessengerClient::class, $clientMock);

        $response = $this
            ->withHeaders(['X-Hub-Signature-256' => $signature])
            ->postJson('/api/messenger/webhook', $payload);

        $response->assertStatus(200)
            ->assertJson(['status' => 'ok']);

        $this->assertDatabaseHas('chatbot_sessions', [
            'channel' => 'messenger',
            'external_id' => $psid,
        ]);

        $session = ChatbotSession::where('channel', 'messenger')->where('external_id', $psid)->first();
        $this->assertNotNull($session);
        $this->assertSame('language_selection', $session->state['current_state'] ?? null);
    }

    public function test_handle_postback_sends_reply_via_chatbot(): void
    {
        config(['facebook.app_secret' => 'test-secret']);

        $psid = 'USER_PSID_456';
        $payload = [
            'object' => 'page',
            'entry' => [
                [
                    'id' => 'PAGE_ID',
                    'time' => 1234567890,
                    'messaging' => [
                        [
                            'sender' => ['id' => $psid],
                            'recipient' => ['id' => 'PAGE_ID'],
                            'timestamp' => 1234567892,
                            'postback' => [
                                'title' => 'Option 1',
                                'payload' => '1',
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $rawBody = json_encode($payload, JSON_THROW_ON_ERROR);
        $signature = 'sha256=' . hash_hmac('sha256', $rawBody, 'test-secret');

        $clientMock = Mockery::mock(FacebookMessengerClient::class);
        $clientMock->shouldReceive('sendTextMessage')->andReturnNull();
        $clientMock->shouldReceive('sendQuickReply')
            ->atLeast()
            ->once()
            ->with(
                $psid,
                Mockery::on(fn ($text): bool => \is_string($text) && $text !== ''),
                Mockery::type('array')
            );
        $this->app->instance(FacebookMessengerClient::class, $clientMock);

        $response = $this
            ->withHeaders(['X-Hub-Signature-256' => $signature])
            ->postJson('/api/messenger/webhook', $payload);

        $response->assertStatus(200)
            ->assertJson(['status' => 'ok']);

        $this->assertDatabaseHas('chatbot_sessions', [
            'channel' => 'messenger',
            'external_id' => $psid,
        ]);
    }
}

