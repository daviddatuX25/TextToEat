<?php

namespace Tests\Feature;

use App\Models\ChatbotSession;
use App\Models\Conversation;
use App\Models\InboundMessage;
use App\Models\OutboundMessenger;
use App\Models\OutboundSms;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChatbotLogsTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_shows_chatbot_logs_index_page(): void
    {
        $user = User::factory()->create();

        ChatbotSession::create([
            'channel' => 'sms',
            'external_id' => 'abc-123',
            'language' => 'en',
            'state' => ['current_state' => 'menu'],
        ]);

        $this->actingAs($user)
            ->get('/portal/logs/chatbot')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('ChatbotLogs')
                ->has('sessions.data.0.id')
                ->has('sessions.data.0.message_count')
            );
    }

    public function test_it_filters_chatbot_logs_by_channel(): void
    {
        $user = User::factory()->create();

        ChatbotSession::create([
            'channel' => 'sms',
            'external_id' => 'sms-1',
            'language' => 'en',
            'state' => ['current_state' => 'menu'],
        ]);

        ChatbotSession::create([
            'channel' => 'web',
            'external_id' => 'web-1',
            'language' => 'en',
            'state' => ['current_state' => 'menu'],
        ]);

        $this->actingAs($user)
            ->get('/portal/logs/chatbot?channel[]=sms')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('ChatbotLogs')
                ->where('sessions.data.0.channel', 'sms')
            );
    }

    public function test_it_filters_chatbot_logs_by_human_takeover(): void
    {
        $user = User::factory()->create();

        $sessionWithHuman = ChatbotSession::create([
            'channel' => 'sms',
            'external_id' => 'with-human',
            'language' => 'en',
            'state' => ['current_state' => 'human_takeover'],
        ]);

        ChatbotSession::create([
            'channel' => 'sms',
            'external_id' => 'without-human',
            'language' => 'en',
            'state' => ['current_state' => 'menu'],
        ]);

        Conversation::create([
            'chatbot_session_id' => $sessionWithHuman->id,
            'channel' => 'sms',
            'external_id' => 'msg-1',
            'status' => 'human_takeover',
        ]);

        $this->actingAs($user)
            ->get('/portal/logs/chatbot?has_human_takeover=1')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('ChatbotLogs')
                ->where('sessions.data.0.has_human_takeover', true)
            );
    }

    public function test_it_computes_message_count_from_inbound_and_outbound(): void
    {
        $user = User::factory()->create();

        $session = ChatbotSession::create([
            'channel' => 'sms',
            'external_id' => 'abc-123',
            'language' => 'en',
            'state' => ['current_state' => 'menu'],
        ]);

        InboundMessage::create([
            'chatbot_session_id' => $session->id,
            'body' => 'hi',
            'channel' => 'sms',
        ]);

        OutboundSms::create([
            'to' => 'abc-123',
            'body' => 'hello',
            'status' => 'sent',
            'channel' => 'sms',
            'chatbot_session_id' => $session->id,
        ]);

        OutboundMessenger::create([
            'to' => 'abc-123',
            'body' => 'via messenger',
        ]);

        $this->actingAs($user)
            ->get('/portal/logs/chatbot')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('ChatbotLogs')
                ->where('sessions.data.0.message_count', 3)
            );
    }

    public function test_it_shows_chatbot_log_detail_page_with_messages(): void
    {
        $user = User::factory()->create();

        $session = ChatbotSession::create([
            'channel' => 'sms',
            'external_id' => 'abc-123',
            'language' => 'en',
            'state' => ['current_state' => 'menu'],
        ]);

        $inbound = InboundMessage::create([
            'chatbot_session_id' => $session->id,
            'body' => 'hi',
            'channel' => 'sms',
        ]);

        $outbound = OutboundSms::create([
            'to' => 'abc-123',
            'body' => 'hello',
            'status' => 'sent',
            'channel' => 'sms',
            'chatbot_session_id' => $session->id,
        ]);

        $this->actingAs($user)
            ->get("/portal/logs/chatbot/{$session->id}")
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('ChatbotLogShow')
                ->where('session.id', $session->id)
                ->has('messages', 2)
            );
    }

    public function test_chatbot_logs_show_excludes_human_segment_messages(): void
    {
        $user = User::factory()->create();

        $session = ChatbotSession::create([
            'channel' => 'sms',
            'external_id' => '09123456789',
            'language' => 'en',
            'state' => ['current_state' => 'human_takeover'],
        ]);
        $conversation = Conversation::create([
            'chatbot_session_id' => $session->id,
            'channel' => 'sms',
            'external_id' => '09123456789',
            'status' => 'human_takeover',
        ]);
        InboundMessage::create([
            'chatbot_session_id' => $session->id,
            'conversation_id' => null,
            'body' => 'Bot inbound',
            'channel' => 'sms',
        ]);
        InboundMessage::create([
            'chatbot_session_id' => $session->id,
            'conversation_id' => $conversation->id,
            'body' => 'Human inbound',
            'channel' => 'sms',
        ]);
        OutboundSms::create([
            'chatbot_session_id' => $session->id,
            'conversation_id' => $conversation->id,
            'to' => '09123456789',
            'body' => 'Staff reply',
            'status' => 'sent',
            'channel' => 'sms',
        ]);

        $response = $this->actingAs($user)
            ->get("/portal/logs/chatbot/{$session->id}")
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('ChatbotLogShow')
                ->where('session.id', $session->id)
                ->has('messages', 1)
            );

        $messages = $response->original->getData()['page']['props']['messages'] ?? [];
        $bodies = array_column($messages, 'body');
        $this->assertContains('Bot inbound', $bodies);
        $this->assertNotContains('Human inbound', $bodies);
        $this->assertNotContains('Staff reply', $bodies);
    }

    public function test_message_count_excludes_human_segment(): void
    {
        $user = User::factory()->create();

        $session = ChatbotSession::create([
            'channel' => 'sms',
            'external_id' => '09123456789',
            'language' => 'en',
            'state' => ['current_state' => 'menu'],
        ]);
        $conversation = Conversation::create([
            'chatbot_session_id' => $session->id,
            'channel' => 'sms',
            'external_id' => '09123456789',
            'status' => 'human_takeover',
        ]);
        InboundMessage::create(['chatbot_session_id' => $session->id, 'body' => 'Bot', 'channel' => 'sms']);
        InboundMessage::create([
            'chatbot_session_id' => $session->id,
            'conversation_id' => $conversation->id,
            'body' => 'Human',
            'channel' => 'sms',
        ]);

        $this->actingAs($user)
            ->get('/portal/logs/chatbot')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('ChatbotLogs')
                ->where('sessions.data.0.message_count', 1)
            );
    }

    /** @see DatabaseDialect / JSON select portability: status options come from distinct state->current_state (works on PostgreSQL and MySQL/MariaDB) */
    public function test_it_returns_status_options_from_json_state(): void
    {
        $user = User::factory()->create();

        ChatbotSession::create([
            'channel' => 'sms',
            'external_id' => 's1',
            'language' => 'en',
            'state' => ['current_state' => 'menu'],
        ]);
        ChatbotSession::create([
            'channel' => 'sms',
            'external_id' => 's2',
            'language' => 'en',
            'state' => ['current_state' => 'human_takeover'],
        ]);

        $response = $this->actingAs($user)
            ->get('/portal/logs/chatbot')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('ChatbotLogs')
                ->has('meta.statusOptions')
            );

        $statusValues = array_column($response->original->getData()['page']['props']['meta']['statusOptions'], 'value');
        $this->assertContains('menu', $statusValues);
        $this->assertContains('human_takeover', $statusValues);
    }
}

