<?php

namespace Tests\Feature;

use App\Messenger\FacebookMessengerClient;
use App\Models\OutboundMessenger;
use App\Models\OutboundSms;
use App\Services\Channels\FacebookMessengerSender;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class OutboundMessagesPollingTest extends TestCase
{
    use RefreshDatabase;

    public function test_outbound_messages_requires_auth(): void
    {
        $this->getJson('/api/chatbot/outbound-messages?channel=sms&external_id=09171234567')
            ->assertStatus(401);
    }

    public function test_outbound_messages_requires_admin(): void
    {
        $user = User::factory()->create(['role' => 'staff']);
        $this->actingAs($user)
            ->getJson('/api/chatbot/outbound-messages?channel=sms&external_id=09171234567')
            ->assertStatus(403);
    }

    public function test_outbound_messages_returns_sms_for_admin(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        OutboundSms::create([
            'to' => '09171234567',
            'body' => 'Your order ABC is on the way!',
            'status' => 'pending',
            'channel' => 'sms',
        ]);

        $response = $this->actingAs($admin)
            ->getJson('/api/chatbot/outbound-messages?channel=sms&external_id=09171234567');

        $response->assertStatus(200)
            ->assertJsonPath('messages.0.body', 'Your order ABC is on the way!')
            ->assertJsonCount(1, 'messages');
    }

    public function test_outbound_messages_returns_messenger_for_admin(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        OutboundMessenger::create([
            'to' => 'psid-123',
            'body' => 'Your order XYZ is ready!',
        ]);

        $response = $this->actingAs($admin)
            ->getJson('/api/chatbot/outbound-messages?channel=messenger&external_id=psid-123');

        $response->assertStatus(200)
            ->assertJsonPath('messages.0.body', 'Your order XYZ is ready!')
            ->assertJsonCount(1, 'messages');
    }

    public function test_outbound_messages_validates_channel_and_external_id(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin)
            ->getJson('/api/chatbot/outbound-messages?channel=web&external_id=x')
            ->assertStatus(422);
        $this->actingAs($admin)
            ->getJson('/api/chatbot/outbound-messages?channel=sms')
            ->assertStatus(422);
    }

    public function test_facebook_messenger_sender_creates_outbound_messenger_after_send(): void
    {
        $client = Mockery::mock(FacebookMessengerClient::class);
        $client->shouldReceive('sendTextMessage')
            ->once()
            ->with('psid-456', 'Hello from staff');
        $this->app->instance(FacebookMessengerClient::class, $client);

        $sender = $this->app->make(FacebookMessengerSender::class);
        $sender->send('psid-456', 'Hello from staff');

        $this->assertDatabaseHas('outbound_messenger', [
            'to' => 'psid-456',
            'body' => 'Hello from staff',
        ]);
        $this->assertEquals(1, OutboundMessenger::where('to', 'psid-456')->count());
    }
}
