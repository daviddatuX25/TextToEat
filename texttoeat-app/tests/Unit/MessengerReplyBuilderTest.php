<?php

namespace Tests\Unit;

use App\Messenger\MessengerReplyBuilder;
use App\Services\ChatbotReplyResolver;
use App\Services\ChatbotSmsNumberLayer;
use PHPUnit\Framework\MockObject\MockObject;
use Tests\TestCase;

class MessengerReplyBuilderTest extends TestCase
{
    /** @var ChatbotReplyResolver&MockObject */
    private ChatbotReplyResolver $replyResolver;

    /** @var ChatbotSmsNumberLayer&MockObject */
    private ChatbotSmsNumberLayer $smsNumberLayer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->replyResolver = $this->createMock(ChatbotReplyResolver::class);
        $this->smsNumberLayer = $this->createMock(ChatbotSmsNumberLayer::class);
    }

    public function test_menu_state_builds_carousel_with_per_item_add_buttons_and_menu_item_payloads(): void
    {
        $builder = new MessengerReplyBuilder($this->replyResolver, $this->smsNumberLayer);

        $menuItems = [];
        for ($i = 1; $i <= 3; $i++) {
            $menuItems[] = [
                'id' => $i,
                'name' => 'Item ' . $i,
                'price' => 100.0 + $i,
            ];
        }

        $descriptors = $builder->build(
            'main_menu',
            'menu',
            'Menu header',
            [],
            $menuItems,
            [],
            'en'
        );

        $this->assertCount(1, $descriptors);
        $first = $descriptors[0];
        $this->assertSame('carousel', $first['type'] ?? null);
        $elements = $first['elements'] ?? null;
        $this->assertIsArray($elements);
        $this->assertCount(3, $elements);

        foreach ($elements as $index => $element) {
            $oneBased = $index + 1;
            $this->assertArrayHasKey('buttons', $element);
            $this->assertIsArray($element['buttons']);
            $this->assertNotEmpty($element['buttons']);
            $button = $element['buttons'][0];
            $this->assertSame('MENU_ITEM_' . $oneBased, $button['payload'] ?? null);
        }
    }

    public function test_menu_state_limits_carousel_to_ten_elements(): void
    {
        $builder = new MessengerReplyBuilder($this->replyResolver, $this->smsNumberLayer);

        $menuItems = [];
        for ($i = 1; $i <= 12; $i++) {
            $menuItems[] = [
                'id' => $i,
                'name' => 'Item ' . $i,
                'price' => 50.0 + $i,
            ];
        }

        $descriptors = $builder->build(
            'main_menu',
            'menu',
            'Menu header',
            [],
            $menuItems,
            [],
            'en'
        );

        $this->assertCount(1, $descriptors);
        $first = $descriptors[0];
        $this->assertSame('carousel', $first['type'] ?? null);
        $elements = $first['elements'] ?? null;
        $this->assertIsArray($elements);
        $this->assertCount(10, $elements);

        // Ensure payload numbering still lines up with element index (MENU_ITEM_1..MENU_ITEM_10).
        foreach ($elements as $index => $element) {
            $oneBased = $index + 1;
            $button = $element['buttons'][0] ?? null;
            $this->assertSame('MENU_ITEM_' . $oneBased, $button['payload'] ?? null);
        }
    }

    public function test_item_selection_cart_menu_builds_button_template_with_cart_actions(): void
    {
        $builder = new MessengerReplyBuilder($this->replyResolver, $this->smsNumberLayer);

        $statePayload = [
            'item_selection_mode' => 'cart_menu',
        ];

        $descriptors = $builder->build(
            'item_selection',
            'item_selection',
            'Cart summary',
            $statePayload,
            [],
            [],
            'en'
        );

        $this->assertCount(1, $descriptors);
        $first = $descriptors[0];
        $this->assertSame('button_template', $first['type'] ?? null);
        $this->assertSame('Cart summary', $first['text'] ?? null);
        $buttons = $first['buttons'] ?? null;
        $this->assertIsArray($buttons);
        $this->assertCount(3, $buttons);

        $payloads = array_column($buttons, 'payload');
        $this->assertSame(
            [
                \App\Messenger\MessengerPayloads::CART_DONE,
                \App\Messenger\MessengerPayloads::CART_ADD,
                \App\Messenger\MessengerPayloads::CART_EDIT,
            ],
            $payloads
        );
    }
}

