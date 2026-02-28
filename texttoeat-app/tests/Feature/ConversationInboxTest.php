<?php

namespace Tests\Feature;

use App\Models\ChatbotSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
                ->where('filters.has_human_takeover', true)
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
}
