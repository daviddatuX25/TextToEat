<?php

namespace Tests\Feature;

use App\Contracts\SmsSenderInterface;
use App\Models\ChatbotSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Mockery;
use Tests\TestCase;

class TextbeeSmsWebhookTest extends TestCase
{
    use RefreshDatabase;

    public function test_incoming_sms_creates_session_and_sends_reply(): void
    {
        $outboundMock = Mockery::mock(SmsSenderInterface::class);
        $outboundMock->shouldReceive('send')
            ->atLeast()
            ->once()
            ->with('09123456789', Mockery::on(fn ($t): bool => \is_string($t) && $t !== ''), 'sms', Mockery::any())
            ->andReturn(['success' => true, 'ids' => [1]]);
        $this->app->instance(SmsSenderInterface::class, $outboundMock);

        $response = $this->postJson('/api/sms/incoming', [
            'from' => '09123456789',
            'message' => 'hi',
            'message_id' => 'unique_id_123',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message_id' => 'unique_id_123',
            ]);

        $this->assertDatabaseHas('chatbot_sessions', [
            'channel' => 'sms',
            'external_id' => '09123456789',
        ]);

        $session = ChatbotSession::where('channel', 'sms')->where('external_id', '09123456789')->first();
        $this->assertNotNull($session);
        $this->assertSame('language_selection', $session->state['current_state'] ?? null);
    }

    public function test_incoming_sms_normalizes_phone_with_country_code(): void
    {
        $outboundMock = Mockery::mock(SmsSenderInterface::class);
        $outboundMock->shouldReceive('send')
            ->atLeast()
            ->once()
            ->with(
                '09123456789',
                Mockery::on(fn ($text): bool => \is_string($text) && $text !== ''),
                'sms',
                Mockery::any()
            )
            ->andReturn(['success' => true, 'ids' => [1]]);
        $this->app->instance(SmsSenderInterface::class, $outboundMock);

        $response = $this->postJson('/api/sms/incoming', [
            'from' => '+639123456789',
            'message' => 'hello',
            'message_id' => 'test_456',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('chatbot_sessions', [
            'channel' => 'sms',
            'external_id' => '09123456789',
        ]);
    }

    public function test_incoming_sms_returns_403_when_signature_invalid_and_secret_configured(): void
    {
        config(['textbee.webhook_secret' => 'my-secret']);

        $response = $this->postJson('/api/sms/incoming', [
            'from' => '09123456789',
            'message' => 'hi',
            'message_id' => 'test_789',
        ]);

        $response->assertStatus(403)
            ->assertJson(['error' => 'Invalid signature']);
    }

    public function test_incoming_sms_accepts_valid_signature_when_secret_configured(): void
    {
        config(['textbee.webhook_secret' => 'my-secret']);

        $payload = [
            'from' => '09123456789',
            'message' => 'hi',
            'message_id' => 'signed_123',
        ];
        $rawBody = json_encode($payload, JSON_THROW_ON_ERROR);
        $signature = 'sha256=' . hash_hmac('sha256', $rawBody, 'my-secret');

        $outboundMock = Mockery::mock(SmsSenderInterface::class);
        $outboundMock->shouldReceive('send')
            ->atLeast()
            ->once()
            ->with('09123456789', Mockery::on(fn ($t): bool => \is_string($t) && $t !== ''), 'sms', Mockery::any())
            ->andReturn(['success' => true, 'ids' => [1]]);
        $this->app->instance(SmsSenderInterface::class, $outboundMock);

        $response = $this->withHeaders(['X-Signature' => $signature])
            ->postJson('/api/sms/incoming', $payload);

        $response->assertStatus(200)
            ->assertJson(['success' => true, 'message_id' => 'signed_123']);
    }

    public function test_incoming_sms_validates_required_fields(): void
    {
        $response = $this->postJson('/api/sms/incoming', [
            'message_id' => 'no_from_or_message',
        ]);

        $response->assertStatus(422);
    }

    public function test_incoming_sms_returns_503_when_send_fails_and_forgets_idempotency_so_retry_succeeds(): void
    {
        $messageId = 'retry_after_fail_1';
        $callCount = 0;
        $outboundMock = Mockery::mock(SmsSenderInterface::class);
        $outboundMock->shouldReceive('send')
            ->andReturnUsing(function () use (&$callCount): array {
                $callCount++;
                return $callCount === 1
                    ? ['success' => false, 'message' => 'FCM delivery failed']
                    : ['success' => true, 'ids' => [1]];
            });
        $this->app->instance(SmsSenderInterface::class, $outboundMock);

        $first = $this->postJson('/api/sms/incoming', [
            'from' => '09123456789',
            'message' => 'hi',
            'message_id' => $messageId,
        ]);
        $first->assertStatus(503)
            ->assertJson(['success' => false, 'message_id' => $messageId, 'retry' => true]);

        $this->assertNull(Cache::get('sms_webhook_seen:' . $messageId));

        $retry = $this->postJson('/api/sms/incoming', [
            'from' => '09123456789',
            'message' => 'hi',
            'message_id' => $messageId,
        ]);
        $retry->assertStatus(200)
            ->assertJson(['success' => true, 'message_id' => $messageId]);
    }
}
