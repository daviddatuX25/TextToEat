<?php

namespace Tests\Feature;

use App\Messenger\FacebookMessengerClient;
use App\Models\ChatbotSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class ConversationInboxTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_shows_inbox_index_page_with_sessions(): void
    {
        $user = User::factory()->create();

        ChatbotSession::create([
            'channel' => 'sms',
            'external_id' => '09123456789',
            'language' => 'en',
            'state' => ['current_state' => 'human_takeover'],
        ]);

        $this->actingAs($user)
            ->get('/portal/inbox')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('ConversationInbox')
                ->has('sessions.data')
                ->has('filters')
                ->missing('filters.has_human_takeover')
                ->where('meta.statusOptions.0.value', 'active')
                ->where('meta.statusOptions.1.value', 'pending')
                ->where('meta.statusOptions.2.value', 'ended')
            );
    }

    public function test_it_filters_inbox_by_channel(): void
    {
        $user = User::factory()->create();

        ChatbotSession::create([
            'channel' => 'sms',
            'external_id' => 'sms-1',
            'language' => 'en',
            'state' => ['current_state' => 'human_takeover'],
        ]);

        $this->actingAs($user)
            ->get('/portal/inbox?channel[]=sms')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('ConversationInbox')
                ->has('sessions.data.0')
                ->where('sessions.data.0.channel', 'sms')
            );
    }

    public function test_inbox_includes_sms_summary_for_sms_sessions(): void
    {
        $user = User::factory()->create();

        $session = ChatbotSession::create([
            'channel' => 'sms',
            'external_id' => '09181112222',
            'language' => 'en',
            'state' => ['current_state' => 'human_takeover'],
        ]);

        \App\Models\OutboundSms::create([
            'to' => '09181112222',
            'body' => 'Test',
            'status' => 'sent',
            'sent_at' => now(),
            'channel' => 'sms',
            'chatbot_session_id' => $session->id,
        ]);

        $this->actingAs($user)
            ->get('/portal/inbox')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('ConversationInbox')
                ->has('sessions.data.0')
                ->has('sessions.data.0.sms_summary')
                ->where('sessions.data.0.sms_summary.sent_count', 1)
            );
    }

    public function test_inbox_status_filter_active_returns_only_sessions_with_thread_messages(): void
    {
        $user = User::factory()->create();

        $activeSession = ChatbotSession::create([
            'channel' => 'sms',
            'external_id' => 'active-1',
            'language' => 'en',
            'state' => ['current_state' => 'human_takeover', 'automation_disabled' => true],
        ]);
        \App\Models\Conversation::create([
            'chatbot_session_id' => $activeSession->id,
            'channel' => 'sms',
            'external_id' => 'active-1',
            'status' => 'human_takeover',
        ]);
        \App\Models\OutboundSms::create([
            'chatbot_session_id' => $activeSession->id,
            'to' => 'active-1',
            'body' => 'Hello',
            'status' => 'sent',
            'channel' => 'sms',
        ]);
        ChatbotSession::create([
            'channel' => 'sms',
            'external_id' => 'pending-1',
            'language' => 'en',
            'state' => ['current_state' => 'human_takeover'],
        ]);

        $this->actingAs($user)
            ->get('/portal/inbox?status[]=active')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('ConversationInbox')
                ->has('sessions.data', 1)
                ->where('sessions.data.0.external_id', 'active-1')
            );
    }

    public function test_inbox_status_filter_pending_returns_only_waiting_sessions(): void
    {
        $user = User::factory()->create();

        ChatbotSession::create([
            'channel' => 'sms',
            'external_id' => 'pending-1',
            'language' => 'en',
            'state' => ['current_state' => 'human_takeover'],
        ]);
        ChatbotSession::create([
            'channel' => 'sms',
            'external_id' => 'active-1',
            'language' => 'en',
            'state' => ['current_state' => 'human_takeover', 'automation_disabled' => true],
        ]);

        $this->actingAs($user)
            ->get('/portal/inbox?status[]=pending')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('ConversationInbox')
                ->has('sessions.data', 1)
                ->where('sessions.data.0.external_id', 'pending-1')
                ->where('sessions.data.0.automation_disabled', false)
            );
    }

    public function test_inbox_status_filter_ended_returns_only_resolved_sessions(): void
    {
        $user = User::factory()->create();

        $ended1 = ChatbotSession::create([
            'channel' => 'sms',
            'external_id' => 'ended-1',
            'language' => 'en',
            'state' => ['current_state' => 'main_menu', 'automation_disabled' => false],
        ]);
        \App\Models\Conversation::create([
            'chatbot_session_id' => $ended1->id,
            'channel' => 'sms',
            'external_id' => 'ended-1',
            'status' => 'human_takeover',
        ]);
        $sessionWithConversation = ChatbotSession::create([
            'channel' => 'sms',
            'external_id' => 'ended-2',
            'language' => 'en',
            'state' => ['current_state' => 'main_menu'],
        ]);
        \App\Models\Conversation::create([
            'chatbot_session_id' => $sessionWithConversation->id,
            'channel' => 'sms',
            'external_id' => 'ended-2',
            'status' => 'human_takeover',
        ]);
        ChatbotSession::create([
            'channel' => 'sms',
            'external_id' => 'active-1',
            'language' => 'en',
            'state' => ['current_state' => 'human_takeover', 'automation_disabled' => true],
        ]);

        $response = $this->actingAs($user)
            ->get('/portal/inbox?status[]=ended')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('ConversationInbox')
                ->has('sessions.data', 2)
            );

        $props = $response->original->getData()['page']['props'] ?? [];
        $externalIds = array_column($props['sessions']['data'] ?? [], 'external_id');
        sort($externalIds);
        $this->assertSame(['ended-1', 'ended-2'], $externalIds);
    }

    public function test_inbox_pending_has_no_thread_messages_active_has_messages(): void
    {
        $user = User::factory()->create();

        $pendingSession = ChatbotSession::create([
            'channel' => 'sms',
            'external_id' => 'pending-msg',
            'language' => 'en',
            'state' => ['current_state' => 'human_takeover'],
        ]);
        \App\Models\Conversation::create([
            'chatbot_session_id' => $pendingSession->id,
            'channel' => 'sms',
            'external_id' => 'pending-msg',
            'status' => 'human_takeover',
        ]);

        $activeSession = ChatbotSession::create([
            'channel' => 'sms',
            'external_id' => 'active-msg',
            'language' => 'en',
            'state' => ['current_state' => 'human_takeover'],
        ]);
        \App\Models\Conversation::create([
            'chatbot_session_id' => $activeSession->id,
            'channel' => 'sms',
            'external_id' => 'active-msg',
            'status' => 'human_takeover',
        ]);
        \App\Models\InboundMessage::create([
            'chatbot_session_id' => $activeSession->id,
            'body' => 'Customer reply',
            'channel' => 'sms',
        ]);

        $responsePending = $this->actingAs($user)
            ->get('/portal/inbox?status[]=pending')
            ->assertStatus(200);
        $idsPending = array_column($responsePending->original->getData()['page']['props']['sessions']['data'] ?? [], 'external_id');
        $this->assertContains('pending-msg', $idsPending);
        $this->assertNotContains('active-msg', $idsPending);

        $responseActive = $this->actingAs($user)->get('/portal/inbox?status[]=active');
        $idsActive = array_column($responseActive->original->getData()['page']['props']['sessions']['data'] ?? [], 'external_id');
        $this->assertContains('active-msg', $idsActive);
        $this->assertNotContains('pending-msg', $idsActive);
    }

    public function test_inbox_excludes_web_channel_and_sessions_never_in_takeover(): void
    {
        $user = User::factory()->create();

        ChatbotSession::create([
            'channel' => 'web',
            'external_id' => 'web-1',
            'language' => 'en',
            'state' => ['current_state' => 'main_menu'],
        ]);
        ChatbotSession::create([
            'channel' => 'sms',
            'external_id' => 'sms-no-takeover',
            'language' => 'en',
            'state' => ['current_state' => 'main_menu'],
        ]);
        ChatbotSession::create([
            'channel' => 'sms',
            'external_id' => 'sms-takeover',
            'language' => 'en',
            'state' => ['current_state' => 'human_takeover'],
        ]);

        $this->actingAs($user)
            ->get('/portal/inbox')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('ConversationInbox')
                ->has('sessions.data', 1)
                ->where('sessions.data.0.external_id', 'sms-takeover')
            );
    }

    public function test_messenger_staff_reply_appears_in_inbox_thread(): void
    {
        $user = User::factory()->create();

        $session = ChatbotSession::create([
            'channel' => 'messenger',
            'external_id' => 'psid-inbox-test',
            'language' => 'en',
            'state' => ['current_state' => 'human_takeover'],
            'last_activity_at' => now(),
        ]);

        $client = Mockery::mock(FacebookMessengerClient::class);
        $client->shouldReceive('sendTextMessage')
            ->once()
            ->with('psid-inbox-test', 'Staff reply here');
        $this->app->instance(FacebookMessengerClient::class, $client);

        $this->app->instance(
            \App\Contracts\MessengerSenderInterface::class,
            $this->app->make(\App\Services\Channels\FacebookMessengerSender::class)
        );

        $this->actingAs($user)
            ->post("/portal/inbox/sessions/{$session->id}/reply", ['message' => 'Staff reply here'])
            ->assertStatus(302)
            ->assertSessionHas('success');

        $response = $this->actingAs($user)
            ->get("/portal/inbox/{$session->id}")
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('ConversationInboxShow')
                ->has('thread')
                ->where('session.id', $session->id)
            );

        $thread = $response->original->getData()['page']['props']['thread'] ?? [];
        $outbound = array_values(array_filter($thread, fn (array $m): bool => ($m['direction'] ?? '') === 'out' && ($m['body'] ?? '') === 'Staff reply here'));
        $this->assertCount(1, $outbound, 'Thread should contain one outbound message with body "Staff reply here"');
    }
}
