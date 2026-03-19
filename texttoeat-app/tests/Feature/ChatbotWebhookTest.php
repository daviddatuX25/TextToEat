<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\ChatbotSession;
use App\Models\Conversation;
use App\Models\DeliveryArea;
use App\Models\InboundMessage;
use App\Models\MenuItem;
use App\Models\OutboundMessenger;
use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChatbotWebhookTest extends TestCase
{
    use RefreshDatabase;

    private ?Category $mainCategory = null;

    protected function setUp(): void
    {
        parent::setUp();
        $this->mainCategory = Category::firstOrCreate(['name' => 'main'], ['name' => 'main']);
    }

    public function test_webhook_creates_session_and_returns_welcome_reply(): void
    {
        $response = $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'user123',
            'body' => 'hi',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['reply', 'state', 'replies'])
            ->assertJsonPath('state.current_state', 'language_selection');
        $replies = $response->json('replies');
        $this->assertGreaterThanOrEqual(2, count($replies));
        $this->assertStringContainsString('TextToEat', $replies[0]);
        $this->assertStringContainsString('language', strtolower($replies[1]));
        $this->assertSame(implode("\n\n", $replies), $response->json('reply'));
        $this->assertStringContainsString('1. English', $response->json('reply'), 'SMS choice-state reply includes numbered options');

        $this->assertDatabaseHas('chatbot_sessions', [
            'channel' => 'sms',
            'external_id' => 'user123',
        ]);

        $session = ChatbotSession::where('channel', 'sms')->where('external_id', 'user123')->first();
        $this->assertNotNull($session);
        $this->assertSame('language_selection', $session->state['current_state'] ?? null);
    }

    public function test_webhook_after_language_choice_transitions_to_main_menu_then_menu(): void
    {
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'user456',
            'body' => 'hello',
        ]);

        $r1 = $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'user456',
            'body' => '1',
        ]);
        $r1->assertStatus(200)
            ->assertJsonPath('state.current_state', 'main_menu')
            ->assertJsonPath('state.selected_language', 'en');
        $this->assertStringContainsString('What would you like to do?', $r1->json('reply'));

        $response = $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'user456',
            'body' => '1',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('state.current_state', 'menu')
            ->assertJsonPath('state.selected_language', 'en');

        $session = ChatbotSession::where('channel', 'sms')->where('external_id', 'user456')->first();
        $this->assertSame('menu', $session->state['current_state'] ?? null);
        $this->assertSame('en', $session->state['selected_language'] ?? null);
        $this->assertSame('en', $session->language);
    }

    public function test_init_returns_replies_for_new_session(): void
    {
        $response = $this->getJson('/api/chatbot/init?' . http_build_query([
            'channel' => 'web',
            'external_id' => 'init_new_user',
        ]));

        $response->assertStatus(200)
            ->assertJsonStructure(['replies', 'reply', 'state']);
        $replies = $response->json('replies');
        $this->assertGreaterThanOrEqual(2, count($replies));
        $this->assertStringContainsString('TextToEat', $replies[0]);
        $this->assertStringContainsString('language', strtolower($replies[1]));
        if (count($replies) >= 3) {
            $this->assertStringContainsString('1.', $replies[2], 'Web/SMS init includes formatted language options');
        }
        $this->assertSame(implode("\n\n", $replies), $response->json('reply'));
    }

    public function test_init_returns_replies_for_returning_session(): void
    {
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'web',
            'external_id' => 'init_return_user',
            'body' => 'hi',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'web',
            'external_id' => 'init_return_user',
            'body' => '1',
        ]);

        $response = $this->getJson('/api/chatbot/init?' . http_build_query([
            'channel' => 'web',
            'external_id' => 'init_return_user',
        ]));

        $response->assertStatus(200)
            ->assertJsonStructure(['replies', 'reply', 'state']);
        $replies = $response->json('replies');
        $this->assertCount(2, $replies);
        $this->assertStringContainsString('TextToEat', $replies[0]);
        $this->assertStringContainsString('What would you like to do?', $replies[1]);
    }

    public function test_webhook_validates_required_fields(): void
    {
        $response = $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
        ]);

        $response->assertStatus(422);
    }

    public function test_menu_state_returns_todays_menu_from_database(): void
    {
        MenuItem::create([
            'name' => 'Sinigang',
            'price' => 85.00,
            'category_id' => $this->mainCategory->id,
            'units_today' => 10,
            'is_sold_out' => false,
            'menu_date' => now()->toDateString(),
        ]);

        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'menu_user',
            'body' => 'hi',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'menu_user',
            'body' => '1',
        ]);
        $response = $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'menu_user',
            'body' => '1',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('state.current_state', 'menu');
        $this->assertStringContainsString('Sinigang', $response->json('reply'));
        $this->assertStringContainsString('85.00', $response->json('reply'));
        $this->assertStringContainsString('1.', $response->json('reply'));
    }

    public function test_keyword_help_returns_help_reply(): void
    {
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'help_user',
            'body' => 'hi',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'help_user',
            'body' => '1',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'help_user',
            'body' => '1',
        ]);

        $response = $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'help_user',
            'body' => 'help',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('state.current_state', 'menu');
        $this->assertStringContainsString('number', $response->json('reply'));
        $this->assertStringContainsString('done', $response->json('reply'));
    }

    public function test_keyword_menu_returns_to_menu_state(): void
    {
        MenuItem::create([
            'name' => 'Adobo',
            'price' => 75.00,
            'category_id' => $this->mainCategory->id,
            'units_today' => 5,
            'is_sold_out' => false,
            'menu_date' => now()->toDateString(),
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'menu_kw_user',
            'body' => 'hi',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'menu_kw_user',
            'body' => '1',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'menu_kw_user',
            'body' => '1',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'menu_kw_user',
            'body' => '1',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'menu_kw_user',
            'body' => '1',
        ]);

        $response = $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'menu_kw_user',
            'body' => 'menu',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('state.current_state', 'menu');
        $session = ChatbotSession::where('channel', 'sms')->where('external_id', 'menu_kw_user')->first();
        $this->assertEmpty($session->state['selected_items'] ?? []);
    }

    public function test_keyword_cancel_clears_selection_and_returns_to_menu(): void
    {
        MenuItem::create([
            'name' => 'Lechon',
            'price' => 120.00,
            'category_id' => $this->mainCategory->id,
            'units_today' => 3,
            'is_sold_out' => false,
            'menu_date' => now()->toDateString(),
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'cancel_user',
            'body' => 'hi',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'cancel_user',
            'body' => '1',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'cancel_user',
            'body' => '1',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'cancel_user',
            'body' => '1',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'cancel_user',
            'body' => '1',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'cancel_user',
            'body' => 'done',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'cancel_user',
            'body' => 'Juan',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'cancel_user',
            'body' => '1',
        ]);

        $response = $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'cancel_user',
            'body' => 'cancel',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('state.current_state', 'main_menu');
        $session = ChatbotSession::where('channel', 'sms')->where('external_id', 'cancel_user')->first();
        $this->assertEmpty($session->state['selected_items'] ?? []);
    }

    public function test_keyword_tao_or_person_transitions_to_human_takeover(): void
    {
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'tao_user',
            'body' => 'hi',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'tao_user',
            'body' => '1',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'tao_user',
            'body' => '1',
        ]);

        $response = $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'tao_user',
            'body' => 'tao',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('state.current_state', 'human_takeover');
        $this->assertStringContainsString('human', $response->json('reply'));

        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'person_user',
            'body' => 'hi',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'person_user',
            'body' => '1',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'person_user',
            'body' => '1',
        ]);
        $personResponse = $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'person_user',
            'body' => 'person',
        ]);
        $personResponse->assertStatus(200)
            ->assertJsonPath('state.current_state', 'human_takeover');
    }

    public function test_webhook_creates_conversation_when_entering_human_takeover_once(): void
    {
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'conv_user',
            'body' => 'hi',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'conv_user',
            'body' => '1',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'conv_user',
            'body' => '1',
        ]);

        $this->assertDatabaseCount('conversations', 0);

        $response = $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'conv_user',
            'body' => 'tao',
        ]);
        $response->assertStatus(200)->assertJsonPath('state.current_state', 'human_takeover');

        $this->assertDatabaseCount('conversations', 1);
        $conversation = Conversation::first();
        $this->assertSame('human_takeover', $conversation->status);
        $session = ChatbotSession::where('channel', 'sms')->where('external_id', 'conv_user')->first();
        $this->assertNotNull($session);
        $this->assertSame($session->id, $conversation->chatbot_session_id);
        $this->assertSame('sms', $conversation->channel);
        $this->assertSame('conv_user', $conversation->external_id);

        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'conv_user',
            'body' => 'another message while in takeover',
        ]);
        $this->assertDatabaseCount('conversations', 1);

        $inbound = InboundMessage::where('chatbot_session_id', $session->id)
            ->where('body', 'another message while in takeover')
            ->first();
        $this->assertNotNull($inbound);
        $this->assertSame($conversation->id, $inbound->conversation_id, 'Inbound during human_takeover should have conversation_id set');
    }

    public function test_webhook_creates_inbound_message_for_bot_flow(): void
    {
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'bot_flow_user',
            'body' => 'hi',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'bot_flow_user',
            'body' => '1',
        ]);

        $session = ChatbotSession::where('channel', 'sms')->where('external_id', 'bot_flow_user')->first();
        $this->assertNotNull($session);

        $inbounds = InboundMessage::where('chatbot_session_id', $session->id)->get();
        $this->assertCount(2, $inbounds);
        foreach ($inbounds as $inbound) {
            $this->assertNull($inbound->conversation_id, 'Bot flow inbound should have null conversation_id for Chatbot Logs');
        }
        $this->assertSame('hi', $inbounds[0]->body);
        $this->assertSame('1', $inbounds[1]->body);
    }

    public function test_web_channel_creates_outbound_messenger_for_replies(): void
    {
        $externalId = 'web_logs_user';
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'web',
            'external_id' => $externalId,
            'body' => 'hi',
        ]);

        $outbound = OutboundMessenger::where('to', $externalId)->get();
        $this->assertGreaterThan(0, $outbound->count(), 'Web channel should persist outbound replies for Chatbot Logs');
        foreach ($outbound as $om) {
            $this->assertNull($om->conversation_id, 'Bot flow outbound should have null conversation_id');
        }
    }

    public function test_keyword_person_in_menu_transitions_to_human_takeover(): void
    {
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'person_menu_user',
            'body' => 'hi',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'person_menu_user',
            'body' => '1',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'person_menu_user',
            'body' => '1',
        ]);

        $response = $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'person_menu_user',
            'body' => 'person',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('state.current_state', 'human_takeover');
        $this->assertStringContainsString('human', $response->json('reply'));
    }

    public function test_keyword_tao_in_confirm_transitions_to_human_takeover(): void
    {
        MenuItem::create([
            'name' => 'Adobo',
            'price' => 75.00,
            'category_id' => $this->mainCategory->id,
            'units_today' => 5,
            'is_sold_out' => false,
            'menu_date' => now()->toDateString(),
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'tao_confirm_user',
            'body' => 'hi',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'tao_confirm_user',
            'body' => '1',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'tao_confirm_user',
            'body' => '1',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'tao_confirm_user',
            'body' => '1',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'tao_confirm_user',
            'body' => 'done',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'tao_confirm_user',
            'body' => 'Juan',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'tao_confirm_user',
            'body' => '1',
        ]);

        $response = $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'tao_confirm_user',
            'body' => 'tao',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('state.current_state', 'human_takeover');
        $this->assertStringContainsString('human', $response->json('reply'));
    }

    public function test_keyword_unknown_in_menu_stays_menu_invalid_message(): void
    {
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'xyz_menu_user',
            'body' => 'hi',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'xyz_menu_user',
            'body' => '1',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'xyz_menu_user',
            'body' => '1',
        ]);

        $response = $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'xyz_menu_user',
            'body' => 'xyz',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('state.current_state', 'menu');
        $this->assertStringContainsString('Invalid option', $response->json('reply'));
    }

    public function test_i18n_language_3_replies_in_ilocano(): void
    {
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'ilo_user',
            'body' => 'hi',
        ]);
        $response = $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'ilo_user',
            'body' => '3',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('state.current_state', 'main_menu')
            ->assertJsonPath('state.selected_language', 'ilo');
        $reply = $response->json('reply');
        $this->assertStringContainsString('Ania ti kayat mo', $reply);

        $session = ChatbotSession::where('channel', 'sms')->where('external_id', 'ilo_user')->first();
        $this->assertSame('ilo', $session->language);
    }

    public function test_after_language_2_replies_use_tagalog(): void
    {
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'tl_user',
            'body' => 'hi',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'tl_user',
            'body' => '2',
        ]);

        $session = ChatbotSession::where('channel', 'sms')->where('external_id', 'tl_user')->first();
        $this->assertSame('tl', $session->language);
        $this->assertSame('tl', $session->state['selected_language'] ?? null);
        $this->assertSame('main_menu', $session->state['current_state'] ?? null);

        $response = $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'tl_user',
            'body' => 'help',
        ]);

        $response->assertStatus(200);
        $reply = $response->json('reply');
        $this->assertStringContainsString('Tumugon', $reply);
    }

    public function test_empty_menu_returns_localized_no_menu_today(): void
    {
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'empty_menu_user',
            'body' => 'hi',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'empty_menu_user',
            'body' => '1',
        ]);
        $response = $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'empty_menu_user',
            'body' => '1',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('state.current_state', 'menu');
        $this->assertStringContainsString('No menu available for today', $response->json('reply'));
    }

    public function test_webhook_rejects_empty_body(): void
    {
        $response = $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'user1',
            'body' => '',
        ]);

        $response->assertStatus(422);
    }

    public function test_webhook_accepts_body_at_max_length(): void
    {
        $body = str_repeat('a', 1000);
        $response = $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'maxlen_user',
            'body' => $body,
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['reply', 'state'])
            ->assertJsonPath('state.current_state', 'language_selection');
    }

    public function test_webhook_numeric_body_invalid_for_language_selection_stays_in_state(): void
    {
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'num_invalid_user',
            'body' => 'hi',
        ]);

        $response = $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'num_invalid_user',
            'body' => '4',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('state.current_state', 'language_selection');
        $this->assertStringContainsString('Invalid choice', $response->json('reply'));
    }

    public function test_fsm_invalid_language_choice_stays_in_language_selection(): void
    {
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'inv_lang_user',
            'body' => 'hello',
        ]);

        $response = $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'inv_lang_user',
            'body' => '0',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('state.current_state', 'language_selection');
        $this->assertStringContainsString('Invalid choice', $response->json('reply'));

        $response2 = $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'inv_lang_user',
            'body' => '4',
        ]);
        $response2->assertStatus(200)
            ->assertJsonPath('state.current_state', 'language_selection');
        $this->assertStringContainsString('Invalid choice', $response2->json('reply'));
    }

    public function test_fsm_menu_number_out_of_range_stays_in_menu(): void
    {
        MenuItem::create([
            'name' => 'Adobo',
            'price' => 75.00,
            'category_id' => $this->mainCategory->id,
            'units_today' => 5,
            'is_sold_out' => false,
            'menu_date' => now()->toDateString(),
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'range_user',
            'body' => 'hi',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'range_user',
            'body' => '1',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'range_user',
            'body' => '1',
        ]);

        $response = $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'range_user',
            'body' => '99',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('state.current_state', 'menu');
        $this->assertStringContainsString('Invalid option', $response->json('reply'));
    }

    public function test_fsm_done_with_no_items_returns_to_menu_with_empty_cart_message(): void
    {
        MenuItem::create([
            'name' => 'Sinigang',
            'price' => 85.00,
            'category_id' => $this->mainCategory->id,
            'units_today' => 10,
            'is_sold_out' => false,
            'menu_date' => now()->toDateString(),
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'done_empty_user',
            'body' => 'hi',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'done_empty_user',
            'body' => '1',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'done_empty_user',
            'body' => '1',
        ]);

        $response = $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'done_empty_user',
            'body' => 'done',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('state.current_state', 'menu');
        $this->assertStringContainsString("You haven't selected any items", $response->json('reply'));
    }

    public function test_fsm_confirm_yes_when_selected_items_empty_returns_to_menu(): void
    {
        MenuItem::create([
            'name' => 'Lechon',
            'price' => 120.00,
            'category_id' => $this->mainCategory->id,
            'units_today' => 3,
            'is_sold_out' => false,
            'menu_date' => now()->toDateString(),
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'confirm_empty_user',
            'body' => 'hi',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'confirm_empty_user',
            'body' => '1',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'confirm_empty_user',
            'body' => '1',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'confirm_empty_user',
            'body' => 'done',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'confirm_empty_user',
            'body' => 'Juan',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'confirm_empty_user',
            'body' => '1',
        ]);
        $session = ChatbotSession::where('channel', 'sms')->where('external_id', 'confirm_empty_user')->first();
        $session->state = array_merge($session->state ?? [], ['current_state' => 'confirm', 'selected_items' => []]);
        $session->save();

        $response = $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'confirm_empty_user',
            'body' => 'yes',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('state.current_state', 'menu');
        $this->assertStringContainsString("You haven't selected any items", $response->json('reply'));
    }

    public function test_session_persists_across_requests(): void
    {
        $channel = 'sms';
        $externalId = 'persist_user';

        $first = $this->postJson('/api/chatbot/webhook', [
            'channel' => $channel,
            'external_id' => $externalId,
            'body' => 'hi',
        ]);
        $first->assertStatus(200)
            ->assertJsonPath('state.current_state', 'language_selection');

        $second = $this->postJson('/api/chatbot/webhook', [
            'channel' => $channel,
            'external_id' => $externalId,
            'body' => '1',
        ]);
        $second->assertStatus(200)
            ->assertJsonPath('state.current_state', 'main_menu')
            ->assertJsonPath('state.selected_language', 'en');

        $third = $this->postJson('/api/chatbot/webhook', [
            'channel' => $channel,
            'external_id' => $externalId,
            'body' => '1',
        ]);
        $third->assertStatus(200)
            ->assertJsonPath('state.current_state', 'menu')
            ->assertJsonPath('state.selected_language', 'en');

        $this->assertSame(1, ChatbotSession::where('channel', $channel)->where('external_id', $externalId)->count());
        $session = ChatbotSession::where('channel', $channel)->where('external_id', $externalId)->first();
        $this->assertSame('menu', $session->state['current_state'] ?? null);
        $this->assertSame('en', $session->state['selected_language'] ?? null);
    }

    public function test_state_selected_items_structure_after_add(): void
    {
        $item = MenuItem::create([
            'name' => 'Sinigang',
            'price' => 85.00,
            'category_id' => $this->mainCategory->id,
            'units_today' => 10,
            'is_sold_out' => false,
            'menu_date' => now()->toDateString(),
        ]);

        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'cart_user',
            'body' => 'hi',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'cart_user',
            'body' => '1',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'cart_user',
            'body' => '1',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'cart_user',
            'body' => '1',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'cart_user',
            'body' => '1',
        ]);

        $session = ChatbotSession::where('channel', 'sms')->where('external_id', 'cart_user')->first();
        $this->assertSame('item_selection', $session->state['current_state'] ?? null);
        $selectedItems = $session->state['selected_items'] ?? [];
        $this->assertIsArray($selectedItems);
        $this->assertCount(1, $selectedItems);
        $this->assertArrayHasKey('menu_item_id', $selectedItems[0]);
        $this->assertArrayHasKey('name', $selectedItems[0]);
        $this->assertArrayHasKey('price', $selectedItems[0]);
        $this->assertArrayHasKey('quantity', $selectedItems[0]);
        $this->assertSame($item->id, $selectedItems[0]['menu_item_id']);
        $this->assertSame('Sinigang', $selectedItems[0]['name']);
        $this->assertSame(85.0, (float) $selectedItems[0]['price']);
        $this->assertSame(1, (int) $selectedItems[0]['quantity']);
    }

    public function test_webhook_accepts_channel_web_and_returns_reply(): void
    {
        $response = $this->postJson('/api/chatbot/webhook', [
            'channel' => 'web',
            'external_id' => 'web-session-abc',
            'body' => 'hi',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['reply', 'state'])
            ->assertJsonPath('state.current_state', 'language_selection');

        $this->assertDatabaseHas('chatbot_sessions', [
            'channel' => 'web',
            'external_id' => 'web-session-abc',
        ]);
    }

    public function test_web_channel_session_persists_across_requests(): void
    {
        $externalId = 'web-persist-' . uniqid();

        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'web',
            'external_id' => $externalId,
            'body' => 'hi',
        ])->assertStatus(200)->assertJsonPath('state.current_state', 'language_selection');

        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'web',
            'external_id' => $externalId,
            'body' => '1',
        ]);
        $response = $this->postJson('/api/chatbot/webhook', [
            'channel' => 'web',
            'external_id' => $externalId,
            'body' => '1',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('state.current_state', 'menu')
            ->assertJsonPath('state.selected_language', 'en');

        $this->assertSame(1, ChatbotSession::where('channel', 'web')->where('external_id', $externalId)->count());
        $session = ChatbotSession::where('channel', 'web')->where('external_id', $externalId)->first();
        $this->assertSame('menu', $session->state['current_state'] ?? null);
        $this->assertSame('en', $session->state['selected_language'] ?? null);
    }

    public function test_empty_menu_then_language_then_menu_stays_no_menu(): void
    {
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'no_menu_user',
            'body' => 'hi',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'no_menu_user',
            'body' => '1',
        ]);
        $response = $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'no_menu_user',
            'body' => '1',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('state.current_state', 'menu');
        $this->assertStringContainsString('No menu available for today', $response->json('reply'));

        $menuResponse = $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'no_menu_user',
            'body' => 'menu',
        ]);
        $menuResponse->assertStatus(200)
            ->assertJsonPath('state.current_state', 'menu');
        $this->assertStringContainsString('No menu available for today', $menuResponse->json('reply'));
    }

    public function test_confirm_creates_order_sms_channel(): void
    {
        $item = MenuItem::create([
            'name' => 'Sinigang',
            'price' => 85.00,
            'category_id' => $this->mainCategory->id,
            'units_today' => 10,
            'is_sold_out' => false,
            'menu_date' => now()->toDateString(),
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'order_sms_user',
            'body' => 'hi',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'order_sms_user',
            'body' => '1',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'order_sms_user',
            'body' => '1',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'order_sms_user',
            'body' => '1',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'order_sms_user',
            'body' => '1',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'order_sms_user',
            'body' => 'done',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'order_sms_user',
            'body' => 'Juan',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'order_sms_user',
            'body' => '1',
        ]);
        $response = $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'order_sms_user',
            'body' => 'yes',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('state.current_state', 'main_menu')
            ->assertJsonPath('state.selected_items', []);
        $replies = $response->json('replies');
        $this->assertNotNull($replies);
        $this->assertCount(2, $replies);
        $this->assertStringContainsString('reference', strtolower($replies[0]));
        $this->assertStringContainsString('What would you like to do?', $replies[1]);
        $this->assertSame($replies[0] . "\n\n" . $replies[1], $response->json('reply'));
        $ref = $response->json('state.last_order_reference');
        $this->assertNotEmpty($ref);
        $this->assertDatabaseHas('orders', ['reference' => $ref, 'channel' => 'sms']);
        $order = Order::where('reference', $ref)->first();
        $this->assertNotNull($order);
        $this->assertSame('Juan', $order->customer_name);
        $this->assertSame('pickup', $order->delivery_type);
        $this->assertSame(1, $order->orderItems()->count());
        $this->assertSame((string) $item->id, (string) $order->orderItems()->first()->menu_item_id);
        $this->assertSame(85.0, (float) $order->total);
    }

    public function test_confirm_creates_order_web_channel(): void
    {
        MenuItem::create([
            'name' => 'Adobo',
            'price' => 75.00,
            'category_id' => $this->mainCategory->id,
            'units_today' => 5,
            'is_sold_out' => false,
            'menu_date' => now()->toDateString(),
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'web',
            'external_id' => 'order_web_user',
            'body' => 'hi',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'web',
            'external_id' => 'order_web_user',
            'body' => '1',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'web',
            'external_id' => 'order_web_user',
            'body' => '1',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'web',
            'external_id' => 'order_web_user',
            'body' => '1',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'web',
            'external_id' => 'order_web_user',
            'body' => '1',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'web',
            'external_id' => 'order_web_user',
            'body' => '4',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'web',
            'external_id' => 'order_web_user',
            'body' => 'Web User',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'web',
            'external_id' => 'order_web_user',
            'body' => '1',
        ]);
        $response = $this->postJson('/api/chatbot/webhook', [
            'channel' => 'web',
            'external_id' => 'order_web_user',
            'body' => 'yes',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('state.current_state', 'main_menu');
        $ref = $response->json('state.last_order_reference');
        $this->assertNotEmpty($ref);
        $this->assertDatabaseHas('orders', ['reference' => $ref, 'channel' => 'web']);
    }

    public function test_idempotency_double_confirm_returns_same_reference(): void
    {
        $item = MenuItem::create([
            'name' => 'Lechon',
            'price' => 120.00,
            'category_id' => $this->mainCategory->id,
            'units_today' => 10,
            'is_sold_out' => false,
            'menu_date' => now()->toDateString(),
        ]);
        $externalId = 'idem_user';
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => $externalId, 'body' => 'hi']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => $externalId, 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => $externalId, 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => $externalId, 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => $externalId, 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => $externalId, 'body' => '4']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => $externalId, 'body' => 'Juan']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => $externalId, 'body' => '1']);
        $r1 = $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => $externalId, 'body' => 'yes']);
        $ref1 = $r1->json('state.last_order_reference');
        $this->assertNotEmpty($ref1);
        $session = ChatbotSession::where('channel', 'sms')->where('external_id', $externalId)->first();
        $cart = [['menu_item_id' => $item->id, 'name' => $item->name, 'price' => (float) $item->price, 'quantity' => 1]];
        $service = app(\App\Chatbot\ChatbotOrderService::class);
        $fingerprint = $service->cartFingerprint($cart);
        $session->state = array_merge($session->state ?? [], [
            'current_state' => 'confirm',
            'selected_items' => $cart,
            'customer_name' => 'Juan',
            'delivery_type' => 'pickup',
            'delivery_place' => null,
            'delivery_fee' => 0,
            'last_order_id' => $r1->json('state.last_order_id'),
            'last_order_reference' => $ref1,
            'last_order_cart_fingerprint' => $fingerprint,
        ]);
        $session->save();
        $r2 = $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => $externalId, 'body' => 'yes']);
        $ref2 = $r2->json('state.last_order_reference');
        $this->assertSame($ref1, $ref2);
        $this->assertSame(1, Order::where('reference', $ref1)->count());
    }

    public function test_status_keyword_returns_last_order_status(): void
    {
        $item = MenuItem::create([
            'name' => 'Sinigang',
            'price' => 85.00,
            'category_id' => $this->mainCategory->id,
            'units_today' => 10,
            'is_sold_out' => false,
            'menu_date' => now()->toDateString(),
        ]);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'status_user', 'body' => 'hi']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'status_user', 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'status_user', 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'status_user', 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'status_user', 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'status_user', 'body' => 'done']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'status_user', 'body' => 'Juan']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'status_user', 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'status_user', 'body' => 'yes']);
        $response = $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'status_user', 'body' => 'status']);
        $response->assertStatus(200);
        $replies = $response->json('replies');
        $this->assertGreaterThanOrEqual(2, count($replies));
        $reply = $response->json('reply');
        $this->assertSame(implode("\n\n", $replies), $reply);
        // Order is received -> always show actual status (no gating)
        $fullReplyForStatus = implode(' ', $replies);
        $this->assertStringContainsString('received', strtolower($fullReplyForStatus));
        $ref = $response->json('state.last_order_reference');
        $this->assertNotEmpty($ref);
        $fullReply = implode(' ', $replies);
        $this->assertStringContainsString('What would you like to do?', $fullReply);
    }

    public function test_status_keyword_with_explicit_reference(): void
    {
        Order::create([
            'reference' => 'ABC123XY',
            'channel' => 'web',
            'status' => 'preparing',
            'customer_name' => '',
            'customer_phone' => '',
            'total' => 50.00,
            'delivery_type' => 'pickup',
            'delivery_place' => null,
            'delivery_fee' => null,
        ]);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'status_ref_user', 'body' => 'hi']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'status_ref_user', 'body' => '1']);
        $response = $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'status_ref_user', 'body' => 'status ABC123XY']);
        $response->assertStatus(200);
        $replies = $response->json('replies');
        $this->assertGreaterThanOrEqual(1, count($replies));
        $fullReply = implode(' ', $replies);
        // Pickup + preparing -> always show actual status
        $this->assertStringContainsString('preparing', strtolower($fullReply));
        $this->assertStringContainsString('What would you like to do?', $fullReply);
    }

    public function test_status_keyword_no_order_returns_none(): void
    {
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'status_none_user', 'body' => 'hi']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'status_none_user', 'body' => '1']);
        $response = $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'status_none_user', 'body' => 'status']);
        $response->assertStatus(200);
        $replies = $response->json('replies');
        $this->assertGreaterThanOrEqual(2, count($replies));
        $fullReply = implode(' ', $replies);
        $this->assertStringContainsString('no order', strtolower($fullReply));
        $this->assertStringContainsString('What would you like to do?', $fullReply);
    }

    public function test_inventory_failure_when_item_sold_out(): void
    {
        MenuItem::create([
            'name' => 'Rare Dish',
            'price' => 50.00,
            'category_id' => $this->mainCategory->id,
            'units_today' => 0,
            'is_sold_out' => false,
            'menu_date' => now()->toDateString(),
        ]);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'inv_user', 'body' => 'hi']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'inv_user', 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'inv_user', 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'inv_user', 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'inv_user', 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'inv_user', 'body' => '4']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'inv_user', 'body' => 'Juan']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'inv_user', 'body' => '1']);
        $response = $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'inv_user', 'body' => 'yes']);
        $response->assertStatus(200);
        $replies = $response->json('replies');
        $this->assertGreaterThanOrEqual(1, count($replies));
        // Inventory failure now surfaces as an invalid option with a clear
        // \"No menu available for today\" message, and we return the user to the menu.
        $this->assertStringContainsString('No menu available for today', $replies[0]);
        $this->assertSame('menu', $response->json('state.current_state'));
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_session_saves_delivery_preferences_after_order(): void
    {
        MenuItem::create([
            'name' => 'Pancit',
            'price' => 80.00,
            'category_id' => $this->mainCategory->id,
            'units_today' => 5,
            'is_sold_out' => false,
            'menu_date' => now()->toDateString(),
        ]);

        $externalId = 'prefs_user';

        // Start SMS flow and choose language.
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => $externalId, 'body' => 'hi']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => $externalId, 'body' => '1']);

        // Go to menu and add one item.
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => $externalId, 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => $externalId, 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => $externalId, 'body' => '1']);

        // Confirm cart, provide name, and choose pickup (option 1).
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => $externalId, 'body' => 'done']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => $externalId, 'body' => 'Juan']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => $externalId, 'body' => '1']);

        // Place the order.
        $response = $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => $externalId, 'body' => 'yes']);
        $response->assertStatus(200)->assertJsonPath('state.current_state', 'main_menu');

        $session = ChatbotSession::where('channel', 'sms')->where('external_id', $externalId)->first();
        $this->assertNotNull($session);
        $this->assertSame('pickup', $session->saved_delivery_type);
        $this->assertNull($session->saved_delivery_place);
        $this->assertSame(0.0, (float) $session->saved_delivery_fee);
    }

    public function test_cart_ux_view_cart_and_confirm(): void
    {
        MenuItem::create([
            'name' => 'Item A',
            'price' => 10.00,
            'category_id' => $this->mainCategory->id,
            'units_today' => 5,
            'is_sold_out' => false,
            'menu_date' => now()->toDateString(),
        ]);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'cart_ux_user', 'body' => 'hi']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'cart_ux_user', 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'cart_ux_user', 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'cart_ux_user', 'body' => '1']);
        $viewReply = $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'cart_ux_user', 'body' => '2'])->json('reply');
        $this->assertStringContainsString('Item A', $viewReply);
        $this->assertStringContainsString('Total', $viewReply);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'cart_ux_user', 'body' => '4']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'cart_ux_user', 'body' => 'Juan']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'cart_ux_user', 'body' => '1']);
        $response = $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'cart_ux_user', 'body' => 'yes']);
        $response->assertStatus(200)->assertJsonPath('state.current_state', 'main_menu');
        $ref = $response->json('state.last_order_reference');
        $this->assertNotEmpty($ref);
        $order = Order::where('reference', $ref)->first();
        $this->assertNotNull($order);
        $this->assertSame(1, $order->orderItems()->count());
        $this->assertSame(20.0, (float) $order->total);
    }

    public function test_cart_change_item_flow_allows_edit_and_remove(): void
    {
        MenuItem::create([
            'name' => 'Item A',
            'price' => 10.00,
            'category_id' => $this->mainCategory->id,
            'units_today' => 5,
            'is_sold_out' => false,
            'menu_date' => now()->toDateString(),
        ]);

        // Build a cart with quantity 2 of Item A
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'change_user', 'body' => 'hi']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'change_user', 'body' => '1']); // language
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'change_user', 'body' => '1']); // main menu -> menu
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'change_user', 'body' => '1']); // pick Item A
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'change_user', 'body' => '2']); // qty 2

        // Enter change/remove flow and select the first cart line
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'change_user', 'body' => '3']);
        $resp = $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'change_user', 'body' => '1']);
        $resp->assertStatus(200);
        $this->assertStringContainsString('Item A', $resp->json('reply'));
        $this->assertStringContainsString('1. Change quantity', $resp->json('reply'));

        // Choose to change quantity
        $resp = $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'change_user', 'body' => '1']);
        $resp->assertStatus(200);
        $this->assertStringContainsString('Item A', $resp->json('reply'));

        // Set new quantity to 5
        $resp = $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'change_user', 'body' => '5']);
        $resp->assertStatus(200)->assertJsonPath('state.item_selection_mode', 'cart_menu');
        $this->assertSame(5, $resp->json('state.selected_items.0.quantity'));

        // Now test remove path in a fresh session
        MenuItem::create([
            'name' => 'Item B',
            'price' => 15.00,
            'category_id' => $this->mainCategory->id,
            'units_today' => 5,
            'is_sold_out' => false,
            'menu_date' => now()->toDateString(),
        ]);

        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'remove_user', 'body' => 'hi']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'remove_user', 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'remove_user', 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'remove_user', 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'remove_user', 'body' => '2']); // qty 2
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'remove_user', 'body' => '3']); // change/remove
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'remove_user', 'body' => '1']); // select first line
        $resp = $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'remove_user', 'body' => '2']); // remove
        $resp->assertStatus(200)->assertJsonPath('state.item_selection_mode', 'cart_menu');
        $this->assertEmpty($resp->json('state.selected_items') ?? []);
    }

    public function test_cart_invalid_input_shows_invalid_option_and_numbered_options(): void
    {
        MenuItem::create([
            'name' => 'Item A',
            'price' => 10.00,
            'category_id' => $this->mainCategory->id,
            'units_today' => 5,
            'is_sold_out' => false,
            'menu_date' => now()->toDateString(),
        ]);

        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'invalid_cart_user', 'body' => 'hi']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'invalid_cart_user', 'body' => '1']); // language
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'invalid_cart_user', 'body' => '1']); // main menu -> menu
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'invalid_cart_user', 'body' => '1']); // add Item A
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'invalid_cart_user', 'body' => '1']); // qty 1
        $resp = $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'invalid_cart_user', 'body' => '5']); // invalid option in cart_menu

        $resp->assertStatus(200)->assertJsonPath('state.current_state', 'item_selection');
        $reply = $resp->json('reply');
        $this->assertStringContainsString('Invalid option', $reply);
        $this->assertStringContainsString('1. Add another item', $reply);
        $this->assertStringContainsString('4. Confirm order', $reply);
    }

    public function test_session_timeout_returns_to_main_menu(): void
    {
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'timeout_user',
            'body' => 'hi',
        ]);
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'timeout_user',
            'body' => '1',
        ]);
        $session = ChatbotSession::where('channel', 'sms')->where('external_id', 'timeout_user')->first();
        $session->last_activity_at = now()->subSeconds(config('chatbot.session_timeout_seconds', 60) + 1);
        $session->save();

        $response = $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'timeout_user',
            'body' => '1',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('state.current_state', 'menu');
    }

    public function test_main_menu_option_2_asks_for_reference_when_none(): void
    {
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'mm2_user', 'body' => 'hi']);
        $rMenu = $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'mm2_user', 'body' => 'en']);
        $rMenu->assertStatus(200)->assertJsonPath('state.current_state', 'main_menu');
        $response = $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'mm2_user', 'body' => 'track']);
        $response->assertStatus(200)->assertJsonPath('state.current_state', 'track_choice');
        $reply = $response->json('reply');
        $this->assertTrue(
            str_contains(strtolower($reply), 'choose') || str_contains(strtolower($reply), 'list') || str_contains(strtolower($reply), 'reference'),
            'Reply should be track choice prompt (choose/list/reference)'
        );
    }

    public function test_track_list_empty_returns_replies(): void
    {
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'track_empty_user', 'body' => 'hi']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'track_empty_user', 'body' => 'en']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'track_empty_user', 'body' => 'track']);
        $response = $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'track_empty_user', 'body' => 'track_list']);
        $response->assertStatus(200)->assertJsonPath('state.current_state', 'main_menu');
        $replies = $response->json('replies');
        $this->assertGreaterThanOrEqual(2, count($replies));
        $fullReply = implode(' ', array_map('strtolower', $replies));
        $this->assertStringContainsString('no orders', $fullReply);
        $this->assertStringContainsString('what would you like to do?', $fullReply);
    }

    public function test_track_list_status_returns_replies(): void
    {
        Order::create([
            'reference' => 'TRK123',
            'channel' => 'sms',
            'external_id' => 'track_list_user',
            'status' => 'ready',
            'pickup_slot' => 'a1',
            'customer_name' => 'X',
            'customer_phone' => '',
            'total' => 50.00,
            'delivery_type' => 'pickup',
            'delivery_place' => null,
            'delivery_fee' => null,
        ]);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'track_list_user', 'body' => 'hi']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'track_list_user', 'body' => 'en']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'track_list_user', 'body' => 'track']);
        $rTrackList = $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'track_list_user', 'body' => 'track_list']);
        $rTrackList->assertStatus(200)->assertJsonPath('state.current_state', 'track_list');
        $response = $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'track_list_user', 'body' => '1']);
        $response->assertStatus(200)->assertJsonPath('state.current_state', 'main_menu');
        $replies = $response->json('replies');
        $this->assertGreaterThanOrEqual(2, count($replies));
        $fullReply = implode(' ', $replies);
        $this->assertStringContainsString('TRK123', $fullReply);
        $this->assertStringContainsString('Ready', $fullReply);
        $this->assertStringContainsString('a1', $fullReply);
        $this->assertStringContainsString('What would you like to do?', $fullReply);
    }

    public function test_track_ref_status_returns_replies(): void
    {
        Order::create([
            'reference' => 'REF456',
            'channel' => 'sms',
            'external_id' => 'track_ref_user',
            'status' => 'ready',
            'pickup_slot' => 'depends',
            'customer_name' => 'Y',
            'customer_phone' => '',
            'total' => 25.00,
            'delivery_type' => 'pickup',
            'delivery_place' => null,
            'delivery_fee' => null,
        ]);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'track_ref_user', 'body' => 'hi']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'track_ref_user', 'body' => 'en']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'track_ref_user', 'body' => 'track']);
        $rRef = $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'track_ref_user', 'body' => 'track_ref']);
        $rRef->assertStatus(200)->assertJsonPath('state.current_state', 'track_ref');
        $response = $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'track_ref_user', 'body' => 'REF456']);
        $response->assertStatus(200)->assertJsonPath('state.current_state', 'main_menu');
        $replies = $response->json('replies');
        $this->assertGreaterThanOrEqual(2, count($replies));
        $fullReply = implode(' ', $replies);
        $this->assertStringContainsString('REF456', $fullReply);
        $this->assertStringContainsString('Ready', $fullReply);
        $this->assertStringContainsString('What would you like to do?', $fullReply);
    }

    public function test_conditional_reply_delivery_on_the_way_returns_status(): void
    {
        Order::create([
            'reference' => 'DLV001',
            'channel' => 'sms',
            'external_id' => 'del_otw_user',
            'status' => 'on_the_way',
            'customer_name' => 'X',
            'customer_phone' => '',
            'total' => 50.00,
            'delivery_type' => 'delivery',
            'delivery_place' => 'Barangay Center',
            'delivery_fee' => 25.00,
        ]);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'del_otw_user', 'body' => 'hi']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'del_otw_user', 'body' => '1']);
        $response = $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'del_otw_user', 'body' => 'status DLV001']);
        $response->assertStatus(200);
        $replies = $response->json('replies');
        $this->assertGreaterThanOrEqual(1, count($replies));
        $fullReply = implode(' ', $replies);
        $this->assertStringContainsString('DLV001', $fullReply);
        $this->assertStringContainsString('On the way', $fullReply);
    }

    public function test_tracking_always_shows_actual_status_delivery_ready(): void
    {
        Order::create([
            'reference' => 'DLV002',
            'channel' => 'sms',
            'external_id' => 'del_ready_user',
            'status' => 'ready',
            'customer_name' => 'Y',
            'customer_phone' => '',
            'total' => 60.00,
            'delivery_type' => 'delivery',
            'delivery_place' => 'Poblacion',
            'delivery_fee' => 25.00,
        ]);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'del_ready_user', 'body' => 'hi']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'del_ready_user', 'body' => '1']);
        $response = $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'del_ready_user', 'body' => 'status DLV002']);
        $response->assertStatus(200);
        $replies = $response->json('replies');
        $this->assertGreaterThanOrEqual(1, count($replies));
        $fullReply = implode(' ', $replies);
        $this->assertStringContainsString('ready', strtolower($fullReply));
        $this->assertStringContainsString('DLV002', $fullReply);
    }

    public function test_tracking_always_shows_actual_status_pickup_ready_no_slot(): void
    {
        Order::create([
            'reference' => 'PUP001',
            'channel' => 'sms',
            'external_id' => 'pup_noslot_user',
            'status' => 'ready',
            'pickup_slot' => null,
            'customer_name' => 'Z',
            'customer_phone' => '',
            'total' => 40.00,
            'delivery_type' => 'pickup',
            'delivery_place' => null,
            'delivery_fee' => null,
        ]);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'pup_noslot_user', 'body' => 'hi']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'pup_noslot_user', 'body' => '1']);
        $response = $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'pup_noslot_user', 'body' => 'status PUP001']);
        $response->assertStatus(200);
        $replies = $response->json('replies');
        $this->assertGreaterThanOrEqual(1, count($replies));
        $fullReply = implode(' ', $replies);
        $this->assertStringContainsString('ready', strtolower($fullReply));
        $this->assertStringContainsString('PUP001', $fullReply);
    }

    public function test_main_menu_option_3_goes_to_language_selection(): void
    {
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'mm3_user', 'body' => 'hi']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'mm3_user', 'body' => '1']);
        $response = $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'mm3_user', 'body' => '3']);
        $response->assertStatus(200)->assertJsonPath('state.current_state', 'language_selection');
        $this->assertStringContainsString('language', strtolower($response->json('reply')));
    }

    public function test_main_menu_option_4_goes_to_human_takeover(): void
    {
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'mm4_user', 'body' => 'hi']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'mm4_user', 'body' => '1']);
        $response = $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'mm4_user', 'body' => '4']);
        $response->assertStatus(200)->assertJsonPath('state.current_state', 'human_takeover');
        $this->assertStringContainsString('human', strtolower($response->json('reply')));
    }

    public function test_human_takeover_already_in_state_returns_empty_reply(): void
    {
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'ht_empty_user', 'body' => 'hi']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'ht_empty_user', 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'ht_empty_user', 'body' => '4']);

        $response = $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'ht_empty_user',
            'body' => 'hello customer reply',
        ]);

        $response->assertStatus(200)->assertJsonPath('state.current_state', 'human_takeover');
        $reply = $response->json('reply');
        $this->assertSame('', $reply);
    }

    public function test_human_takeover_exit_session_transitions_to_main_menu(): void
    {
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'ht_exit_user', 'body' => 'hi']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'ht_exit_user', 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'ht_exit_user', 'body' => '4']);

        $response = $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'ht_exit_user',
            'body' => 'exit session',
        ]);

        $response->assertStatus(200)->assertJsonPath('state.current_state', 'main_menu');
        $this->assertStringContainsString('left', strtolower($response->json('reply')));

        $session = ChatbotSession::where('channel', 'sms')->where('external_id', 'ht_exit_user')->first();
        $this->assertNotNull($session);
        $this->assertSame('main_menu', $session->state['current_state'] ?? null);
        $this->assertFalse((bool) ($session->state['automation_disabled'] ?? true));
    }

    public function test_human_takeover_exit_session_case_insensitive(): void
    {
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'ht_exit_ci_user', 'body' => 'hi']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'ht_exit_ci_user', 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'ht_exit_ci_user', 'body' => '4']);

        $response = $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'ht_exit_ci_user',
            'body' => 'EXIT SESSION',
        ]);

        $response->assertStatus(200)->assertJsonPath('state.current_state', 'main_menu');
    }

    public function test_human_takeover_persists_inbound_message(): void
    {
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'ht_inbound_user', 'body' => 'hi']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'ht_inbound_user', 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'ht_inbound_user', 'body' => '4']);

        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'ht_inbound_user',
            'body' => 'mabisinakon',
        ]);

        $session = ChatbotSession::where('channel', 'sms')->where('external_id', 'ht_inbound_user')->first();
        $this->assertNotNull($session);
        $this->assertDatabaseHas('inbound_messages', [
            'chatbot_session_id' => $session->id,
            'body' => 'mabisinakon',
        ]);
    }

    public function test_order_with_anonymous_name_stores_anonymous(): void
    {
        MenuItem::create([
            'name' => 'Adobo',
            'price' => 75.00,
            'category_id' => $this->mainCategory->id,
            'units_today' => 5,
            'is_sold_out' => false,
            'menu_date' => now()->toDateString(),
        ]);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'anon_user', 'body' => 'hi']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'anon_user', 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'anon_user', 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'anon_user', 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'anon_user', 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'anon_user', 'body' => '4']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'anon_user', 'body' => 'anonymous']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'anon_user', 'body' => '1']);
        $response = $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'anon_user', 'body' => 'yes']);
        $response->assertStatus(200)->assertJsonPath('state.current_state', 'main_menu');
        $ref = $response->json('state.last_order_reference');
        $order = Order::where('reference', $ref)->first();
        $this->assertNotNull($order);
        $this->assertSame('Anonymous', $order->customer_name);
    }

    public function test_order_placed_after_flow_returns_to_main_menu(): void
    {
        MenuItem::create([
            'name' => 'Sinigang',
            'price' => 85.00,
            'category_id' => $this->mainCategory->id,
            'units_today' => 10,
            'is_sold_out' => false,
            'menu_date' => now()->toDateString(),
        ]);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'opl_user', 'body' => 'hi']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'opl_user', 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'opl_user', 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'opl_user', 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'opl_user', 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'opl_user', 'body' => 'done']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'opl_user', 'body' => 'Juan']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'opl_user', 'body' => '2']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'opl_user', 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'opl_user', 'body' => 'yes']);
        $response = $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'opl_user', 'body' => 'anything']);
        $response->assertStatus(200)->assertJsonPath('state.current_state', 'main_menu');
        $this->assertStringContainsString('What would you like to do?', $response->json('reply'));
    }

    public function test_delivery_option_2_stores_municipal_hall_free(): void
    {
        DeliveryArea::create(['name' => 'Municipal Hall', 'is_free' => true, 'fee' => null, 'sort_order' => 0]);
        MenuItem::create([
            'name' => 'Lechon',
            'price' => 120.00,
            'category_id' => $this->mainCategory->id,
            'units_today' => 5,
            'is_sold_out' => false,
            'menu_date' => now()->toDateString(),
        ]);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'del2_user', 'body' => 'hi']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'del2_user', 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'del2_user', 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'del2_user', 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'del2_user', 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'del2_user', 'body' => '4']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'del2_user', 'body' => 'Maria']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'del2_user', 'body' => '2']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'del2_user', 'body' => '1']);
        $response = $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'del2_user', 'body' => 'yes']);
        $response->assertStatus(200)->assertJsonPath('state.current_state', 'main_menu');
        $ref = $response->json('state.last_order_reference');
        $order = Order::where('reference', $ref)->first();
        $this->assertSame('delivery', $order->delivery_type);
        $this->assertSame('Municipal Hall', $order->delivery_place);
        $this->assertSame(0.0, (float) $order->delivery_fee);
    }

    public function test_main_menu_intent_order_goes_to_menu(): void
    {
        MenuItem::create([
            'name' => 'Adobo',
            'price' => 75.00,
            'category_id' => $this->mainCategory->id,
            'units_today' => 5,
            'is_sold_out' => false,
            'menu_date' => now()->toDateString(),
        ]);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'intent_user', 'body' => 'hi']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'intent_user', 'body' => '1']);
        $response = $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'intent_user', 'body' => 'order']);
        $response->assertStatus(200)->assertJsonPath('state.current_state', 'menu');
        $this->assertStringContainsString('Adobo', $response->json('reply'));
    }

    public function test_messenger_order_stored_with_channel_messenger_and_skip_collect_name(): void
    {
        $psid = 'MESSENGER_PSID_999';
        MenuItem::create([
            'name' => 'Pancit',
            'price' => 65.00,
            'category_id' => $this->mainCategory->id,
            'units_today' => 10,
            'is_sold_out' => false,
            'menu_date' => now()->toDateString(),
        ]);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'messenger', 'external_id' => $psid, 'body' => 'hi']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'messenger', 'external_id' => $psid, 'body' => 'en']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'messenger', 'external_id' => $psid, 'body' => 'order']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'messenger', 'external_id' => $psid, 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'messenger', 'external_id' => $psid, 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'messenger', 'external_id' => $psid, 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'messenger', 'external_id' => $psid, 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'messenger', 'external_id' => $psid, 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'messenger', 'external_id' => $psid, 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'messenger', 'external_id' => $psid, 'body' => '1']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'messenger', 'external_id' => $psid, 'body' => '1']);
        $rDone = $this->postJson('/api/chatbot/webhook', ['channel' => 'messenger', 'external_id' => $psid, 'body' => 'done']);
        $rDone->assertStatus(200)->assertJsonPath('state.current_state', 'delivery_choice');
        $this->assertStringContainsString('receive', strtolower($rDone->json('reply')));
        $this->postJson('/api/chatbot/webhook', ['channel' => 'messenger', 'external_id' => $psid, 'body' => '1']);
        $response = $this->postJson('/api/chatbot/webhook', ['channel' => 'messenger', 'external_id' => $psid, 'body' => 'yes']);
        $response->assertStatus(200)->assertJsonPath('state.current_state', 'main_menu');
        $ref = $response->json('state.last_order_reference');
        $this->assertNotEmpty($ref);
        $this->assertDatabaseHas('orders', ['reference' => $ref, 'channel' => 'messenger', 'external_id' => $psid]);
        $order = Order::where('reference', $ref)->first();
        $this->assertNotNull($order);
        $this->assertSame('Anonymous', $order->customer_name);
    }

    public function test_messenger_track_list_shows_recent_orders_after_order_placed(): void
    {
        $psid = 'MESSENGER_PSID_TRACK';
        MenuItem::create([
            'name' => 'Lumpia',
            'price' => 55.00,
            'category_id' => $this->mainCategory->id,
            'units_today' => 10,
            'is_sold_out' => false,
            'menu_date' => now()->toDateString(),
        ]);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'messenger', 'external_id' => $psid, 'body' => 'hi']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'messenger', 'external_id' => $psid, 'body' => 'en']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'messenger', 'external_id' => $psid, 'body' => 'order']); // main_menu -> menu
        $this->postJson('/api/chatbot/webhook', ['channel' => 'messenger', 'external_id' => $psid, 'body' => '1']); // item 1
        $this->postJson('/api/chatbot/webhook', ['channel' => 'messenger', 'external_id' => $psid, 'body' => '1']); // qty 1
        $this->postJson('/api/chatbot/webhook', ['channel' => 'messenger', 'external_id' => $psid, 'body' => 'done']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'messenger', 'external_id' => $psid, 'body' => '1']); // pickup
        $this->postJson('/api/chatbot/webhook', ['channel' => 'messenger', 'external_id' => $psid, 'body' => 'yes']);
        $rMain = $this->postJson('/api/chatbot/webhook', ['channel' => 'messenger', 'external_id' => $psid, 'body' => 'track']);
        $rMain->assertStatus(200)->assertJsonPath('state.current_state', 'track_choice');
        $rList = $this->postJson('/api/chatbot/webhook', ['channel' => 'messenger', 'external_id' => $psid, 'body' => 'track_list']);
        $rList->assertStatus(200);
        $reply = $rList->json('reply');
        $this->assertStringContainsString('recent orders', strtolower($reply));
        $ref = Order::where('channel', 'messenger')->where('external_id', $psid)->value('reference');
        $this->assertNotEmpty($ref);
        $this->assertStringContainsString($ref, $reply);
    }

    /** SMS/web: numeric "1" in language_selection is normalized to "en" and reaches main_menu. */
    public function test_sms_number_normalization_language_then_main_menu(): void
    {
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'norm_user', 'body' => 'hi']);
        $r = $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'norm_user', 'body' => '1']);
        $r->assertStatus(200)->assertJsonPath('state.current_state', 'main_menu')->assertJsonPath('state.selected_language', 'en');
        // From main_menu, numeric "2" is normalized to "track" and reaches track_choice
        $r2 = $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'norm_user', 'body' => '2']);
        $r2->assertStatus(200)->assertJsonPath('state.current_state', 'track_choice');
    }

    /** SMS/web: invalid number in choice state leaves body unchanged; FSM shows invalid and stays in main_menu. */
    public function test_sms_invalid_number_in_choice_state_stays_in_main_menu(): void
    {
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'inv_num_user', 'body' => 'hi']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'inv_num_user', 'body' => '1']);
        $response = $this->postJson('/api/chatbot/webhook', ['channel' => 'sms', 'external_id' => 'inv_num_user', 'body' => '99']);
        $response->assertStatus(200)->assertJsonPath('state.current_state', 'main_menu');
        $replies = $response->json('replies');
        $fullReply = implode(' ', $replies);
        $this->assertStringContainsString('invalid', strtolower($fullReply));
    }

    /** Web: invalid input in main_menu reply includes numbered options so user sees choices. */
    public function test_web_invalid_main_menu_includes_numbered_options(): void
    {
        $this->postJson('/api/chatbot/webhook', ['channel' => 'web', 'external_id' => 'web_inv_user', 'body' => 'hi']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'web', 'external_id' => 'web_inv_user', 'body' => '1']);
        $response = $this->postJson('/api/chatbot/webhook', [
            'channel' => 'web',
            'external_id' => 'web_inv_user',
            'body' => 'hello',
        ]);
        $response->assertStatus(200)->assertJsonPath('state.current_state', 'main_menu');
        $reply = $response->json('reply');
        $this->assertStringContainsString('Invalid option', $reply);
        $this->assertStringContainsString('1. Place order', $reply);
        $this->assertStringContainsString('2. Track order', $reply);
    }

    /** Main menu canonicals from config: order, track, language, human_takeover transition correctly. */
    public function test_main_menu_canonicals_from_config_transition(): void
    {
        $uid = 'mm_canon_user';
        $this->postJson('/api/chatbot/webhook', ['channel' => 'web', 'external_id' => $uid, 'body' => 'hi']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'web', 'external_id' => $uid, 'body' => '1']);

        $rOrder = $this->postJson('/api/chatbot/webhook', ['channel' => 'web', 'external_id' => $uid, 'body' => 'order']);
        $rOrder->assertStatus(200)->assertJsonPath('state.current_state', 'menu');

        $this->postJson('/api/chatbot/webhook', ['channel' => 'web', 'external_id' => $uid . '2', 'body' => 'hi']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'web', 'external_id' => $uid . '2', 'body' => '1']);
        $rTrack = $this->postJson('/api/chatbot/webhook', ['channel' => 'web', 'external_id' => $uid . '2', 'body' => 'track']);
        $rTrack->assertStatus(200)->assertJsonPath('state.current_state', 'track_choice');

        $this->postJson('/api/chatbot/webhook', ['channel' => 'web', 'external_id' => $uid . '3', 'body' => 'hi']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'web', 'external_id' => $uid . '3', 'body' => '1']);
        $rLang = $this->postJson('/api/chatbot/webhook', ['channel' => 'web', 'external_id' => $uid . '3', 'body' => 'language']);
        $rLang->assertStatus(200)->assertJsonPath('state.current_state', 'language_selection');

        $this->postJson('/api/chatbot/webhook', ['channel' => 'web', 'external_id' => $uid . '4', 'body' => 'hi']);
        $this->postJson('/api/chatbot/webhook', ['channel' => 'web', 'external_id' => $uid . '4', 'body' => '1']);
        $rHt = $this->postJson('/api/chatbot/webhook', ['channel' => 'web', 'external_id' => $uid . '4', 'body' => 'human_takeover']);
        $rHt->assertStatus(200)->assertJsonPath('state.current_state', 'human_takeover');
    }

    /** SMS: first message (invalid input) lands in language_selection and reply includes numbered language options. */
    public function test_sms_first_message_language_selection_includes_options(): void
    {
        $response = $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'sms_first_lang_user',
            'body' => 'sdf',
        ]);
        $response->assertStatus(200)->assertJsonPath('state.current_state', 'language_selection');
        $reply = $response->json('reply');
        $this->assertStringContainsString('Welcome', $reply);
        $this->assertStringContainsString('1. English', $reply);
        $this->assertStringContainsString('2. Tagalog', $reply);
        $this->assertStringContainsString('3. Ilocano', $reply);
    }

    /** SMS/Web: invalid language reply includes numbered options so user can retry. */
    public function test_sms_invalid_language_reply_includes_options(): void
    {
        $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'sms_inv_lang_user',
            'body' => 'hi',
        ]);
        $response = $this->postJson('/api/chatbot/webhook', [
            'channel' => 'sms',
            'external_id' => 'sms_inv_lang_user',
            'body' => 'xyz',
        ]);
        $response->assertStatus(200)->assertJsonPath('state.current_state', 'language_selection');
        $reply = $response->json('reply');
        $this->assertStringContainsString('Invalid', $reply);
        $this->assertStringContainsString('1. English', $reply);
        $this->assertStringContainsString('2. Tagalog', $reply);
    }
}
