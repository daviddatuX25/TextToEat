<?php

namespace Tests\Unit;

use App\Services\ChatbotReplyResolver;
use App\Services\ChatbotSmsNumberLayer;
use Tests\TestCase;

class ChatbotSmsNumberLayerTest extends TestCase
{
    private ChatbotSmsNumberLayer $layer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->layer = new ChatbotSmsNumberLayer(app(ChatbotReplyResolver::class));
    }

    public function test_normalizes_cart_menu_1_to_add(): void
    {
        $result = $this->layer->normalizeBodyForChoiceState('item_selection', '1', [
            'item_selection_mode' => 'cart_menu',
        ]);
        $this->assertSame('add', $result);
    }

    public function test_normalizes_cart_menu_4_to_confirm(): void
    {
        $result = $this->layer->normalizeBodyForChoiceState('item_selection', '4', [
            'item_selection_mode' => 'cart_menu',
        ]);
        $this->assertSame('confirm', $result);
    }

    public function test_normalizes_edit_action_2_to_remove(): void
    {
        $result = $this->layer->normalizeBodyForChoiceState('item_selection', '2', [
            'item_selection_mode' => 'edit_action',
        ]);
        $this->assertSame('remove', $result);
    }

    public function test_normalizes_cart_menu_2_to_view_cart(): void
    {
        $result = $this->layer->normalizeBodyForChoiceState('item_selection', '2', [
            'item_selection_mode' => 'cart_menu',
        ]);
        $this->assertSame('view_cart', $result);
    }

    public function test_normalizes_cart_menu_3_to_edit(): void
    {
        $result = $this->layer->normalizeBodyForChoiceState('item_selection', '3', [
            'item_selection_mode' => 'cart_menu',
        ]);
        $this->assertSame('edit', $result);
    }

    public function test_normalizes_edit_action_1_to_change_quantity(): void
    {
        $result = $this->layer->normalizeBodyForChoiceState('item_selection', '1', [
            'item_selection_mode' => 'edit_action',
        ]);
        $this->assertSame('change_quantity', $result);
    }

    public function test_normalizes_edit_action_3_to_back(): void
    {
        $result = $this->layer->normalizeBodyForChoiceState('item_selection', '3', [
            'item_selection_mode' => 'edit_action',
        ]);
        $this->assertSame('back', $result);
    }

    public function test_normalizes_edit_select_0_to_remove(): void
    {
        $result = $this->layer->normalizeBodyForChoiceState('item_selection', '0', [
            'item_selection_mode' => 'edit_select',
        ]);
        $this->assertSame('remove', $result);
    }

    public function test_leaves_body_unchanged_when_item_selection_without_mode(): void
    {
        $result = $this->layer->normalizeBodyForChoiceState('item_selection', '1', []);
        $this->assertSame('1', $result);
    }

    public function test_leaves_done_unchanged(): void
    {
        $result = $this->layer->normalizeBodyForChoiceState('item_selection', 'done', [
            'item_selection_mode' => 'cart_menu',
        ]);
        $this->assertSame('done', $result);
    }
}
