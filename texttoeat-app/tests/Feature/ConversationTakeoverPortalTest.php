<?php

namespace Tests\Feature;

use App\Models\ChatbotSession;
use App\Models\OutboundSms;
use App\Models\User;
use App\Services\FacebookMessengerClient;
use App\Services\OutboundSmsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class ConversationTakeoverPortalTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_shows_takeover_detail_page_for_sms_session(): void
    {
        $user = User::factory()->create();

        $session = ChatbotSession::create([
            'channel' => 'sms',
            'external_id' => '09123456789',
            'language' => 'en',
            'state' => ['current_state' => 'human_takeover'],
            'last_activity_at' => now(),
        ]);

        OutboundSms::create([
            'to' => '09123456789',
            'body' => 'Hello',
            'status' => 'sent',
            'sent_at' => now(),
            'channel' => 'sms',
            'chatbot_session_id' => $session->id,
        ]);

        $this->actingAs($user)
            ->get("/portal/inbox/{$session->id}")
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('ConversationInboxShow')
                ->where('session.id', $session->id)
                ->where('session.channel', 'sms')
                ->has('outbound_sms.0.id')
            );
    }

    public function test_staff_can_reply_via_sms_outbound_service(): void
    {
        $user = User::factory()->create();

        $session = ChatbotSession::create([
            'channel' => 'sms',
            'external_id' => '09123456789',
            'language' => 'en',
            'state' => ['current_state' => 'human_takeover'],
            'last_activity_at' => now(),
        ]);

        $smsMock = Mockery::mock(OutboundSmsService::class);
        $smsMock->shouldReceive('enqueueAndSendFcm')
            ->once()
            ->with('09123456789', Mockery::type('string'), 'sms', $session->id)
            ->andReturn(['success' => true, 'ids' => [1]]);
        $this->app->instance(OutboundSmsService::class, $smsMock);

        $fbMock = Mockery::mock(FacebookMessengerClient::class);
        $this->app->instance(FacebookMessengerClient::class, $fbMock);

        $this->actingAs($user)
            ->post("/portal/inbox/sessions/{$session->id}/reply", ['message' => 'Hi there'])
            ->assertStatus(302)
            ->assertSessionHas('success');
    }

    public function test_staff_can_reply_via_messenger_client(): void
    {
        $user = User::factory()->create();

        $session = ChatbotSession::create([
            'channel' => 'messenger',
            'external_id' => 'psid-123',
            'language' => 'en',
            'state' => ['current_state' => 'human_takeover'],
            'last_activity_at' => now(),
        ]);

        $smsMock = Mockery::mock(OutboundSmsService::class);
        $this->app->instance(OutboundSmsService::class, $smsMock);

        $fbMock = Mockery::mock(FacebookMessengerClient::class);
        $fbMock->shouldReceive('sendTextMessage')
            ->once()
            ->with('psid-123', Mockery::type('string'));
        $this->app->instance(FacebookMessengerClient::class, $fbMock);

        $this->actingAs($user)
            ->post("/portal/inbox/sessions/{$session->id}/reply", ['message' => 'Hello'])
            ->assertStatus(302)
            ->assertSessionHas('success');
    }

    public function test_staff_can_toggle_automation_and_mark_solved(): void
    {
        $user = User::factory()->create();

        $session = ChatbotSession::create([
            'channel' => 'sms',
            'external_id' => '09120001111',
            'language' => 'en',
            'state' => ['current_state' => 'human_takeover', 'automation_disabled' => false],
            'last_activity_at' => now(),
        ]);

        $this->actingAs($user)
            ->patch("/portal/inbox/sessions/{$session->id}/automation", ['enabled' => false])
            ->assertStatus(302)
            ->assertSessionHas('success');

        $session->refresh();
        $this->assertTrue((bool) ($session->state['automation_disabled'] ?? false));

        $this->actingAs($user)
            ->post("/portal/inbox/sessions/{$session->id}/resolve")
            ->assertStatus(302);

        $session->refresh();
        $this->assertSame('main_menu', $session->state['current_state'] ?? null);
        $this->assertFalse((bool) ($session->state['automation_disabled'] ?? true));
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }
}

