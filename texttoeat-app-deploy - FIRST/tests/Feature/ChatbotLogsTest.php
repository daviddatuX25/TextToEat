<?php

namespace Tests\Feature;

use App\Models\ChatbotSession;
use App\Models\Conversation;
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
}

