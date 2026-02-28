<?php

namespace Tests\Feature;

use App\Contracts\MessengerSenderInterface;
use App\Contracts\SmsSenderInterface;
use App\Models\ActionLog;
use App\Models\ChatbotSession;
use App\Models\OutboundSms;
use App\Models\User;
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

        $smsMock = Mockery::mock(SmsSenderInterface::class);
        $smsMock->shouldReceive('send')
            ->once()
            ->with('09123456789', Mockery::type('string'), 'sms', $session->id)
            ->andReturn(['success' => true, 'ids' => [1]]);
        $this->app->instance(SmsSenderInterface::class, $smsMock);

        $fbMock = Mockery::mock(MessengerSenderInterface::class);
        $this->app->instance(MessengerSenderInterface::class, $fbMock);

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

        $smsMock = Mockery::mock(SmsSenderInterface::class);
        $this->app->instance(SmsSenderInterface::class, $smsMock);

        $fbMock = Mockery::mock(MessengerSenderInterface::class);
        $fbMock->shouldReceive('send')
            ->once()
            ->with('psid-123', Mockery::type('string'));
        $this->app->instance(MessengerSenderInterface::class, $fbMock);

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

        $this->assertDatabaseHas('action_log', [
            'model' => 'ChatbotSession',
            'model_id' => $session->id,
            'action' => 'takeover_resolved',
            'user_id' => $user->id,
        ]);
        $log = ActionLog::query()->where('action', 'takeover_resolved')->where('model_id', $session->id)->first();
        $this->assertSame('human_takeover', $log->payload['previous_state'] ?? null);
        $this->assertSame('main_menu', $log->payload['new_state'] ?? null);
    }

    public function test_takeover_automation_toggle_is_logged(): void
    {
        $user = User::factory()->create();

        $session = ChatbotSession::create([
            'channel' => 'sms',
            'external_id' => '09120002222',
            'language' => 'en',
            'state' => ['current_state' => 'human_takeover', 'automation_disabled' => false],
            'last_activity_at' => now(),
        ]);

        $this->actingAs($user)
            ->patch("/portal/inbox/sessions/{$session->id}/automation", ['enabled' => false])
            ->assertStatus(302);

        $this->assertDatabaseHas('action_log', [
            'model' => 'ChatbotSession',
            'model_id' => $session->id,
            'action' => 'takeover_automation_disabled',
            'user_id' => $user->id,
        ]);

        $this->actingAs($user)
            ->patch("/portal/inbox/sessions/{$session->id}/automation", ['enabled' => true])
            ->assertStatus(302);

        $this->assertDatabaseHas('action_log', [
            'model' => 'ChatbotSession',
            'model_id' => $session->id,
            'action' => 'takeover_automation_enabled',
            'user_id' => $user->id,
        ]);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }
}

