<?php

namespace App\Http\Controllers;

use App\Chatbot\ChatbotFsm;
use App\Chatbot\ChatbotInventoryException;
use App\Chatbot\ChatbotOrderService;
use App\Models\ChatbotSession;
use App\Models\MenuItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChatbotWebhookController extends Controller
{
    public function init(Request $request): JsonResponse
    {
        $channel = $request->query('channel');
        $externalId = $request->query('external_id');
        if (! is_string($channel) || $channel === '' || ! is_string($externalId) || $externalId === '') {
            return response()->json(['message' => 'channel and external_id are required'], 422);
        }

        $session = ChatbotSession::where('channel', $channel)->where('external_id', $externalId)->first();
        $locale = $session?->language ?? 'en';

        if ($session === null) {
            $replies = [
                __('chatbot.greeting', [], $locale),
                __('chatbot.welcome', [], $locale),
            ];
            $state = ['current_state' => 'language_selection'];
        } else {
            $replies = [
                __('chatbot.greeting', [], $locale),
                __('chatbot.main_menu_prompt', [], $locale),
            ];
            $state = $session->state ?? [];
        }

        return response()->json([
            'replies' => $replies,
            'reply' => implode("\n\n", $replies),
            'state' => $state,
        ]);
    }

    public function webhook(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'channel' => ['required', 'string', 'in:sms,messenger,web'],
            'external_id' => ['required', 'string'],
            'body' => ['required', 'string'],
        ]);
        $channel = $validated['channel'];
        $externalId = $validated['external_id'];
        $body = $validated['body'];

        $session = ChatbotSession::where('channel', $channel)->where('external_id', $externalId)->first();
        $state = $session !== null ? $session->state ?? [] : [];
        $currentState = $state['current_state'] ?? 'welcome';
        $locale = $session?->language ?? 'en';

        if ($session === null) {
            $session = ChatbotSession::create([
                'channel' => $channel,
                'external_id' => $externalId,
                'language' => 'en',
                'state' => [],
                'last_activity_at' => now(),
            ]);
        }

        $menuItems = MenuItem::forToday()->get()->map(fn ($m) => [
            'id' => $m->id,
            'name' => $m->name,
            'price' => (float) $m->price,
        ])->values()->all();

        $fsm = new ChatbotFsm();
        [$nextState, $reply, $statePayload] = $fsm->transition($currentState, $body, $state, $menuItems, $locale);

        $newState = array_merge($state, ['current_state' => $nextState], $statePayload);

        if ($nextState === 'order_placed') {
            $orderChannel = $channel === 'web' ? 'web' : 'sms';
            $selectedItems = $this->normalizeSelectedItems($newState['selected_items'] ?? []);
            $customerName = $newState['customer_name'] ?? 'Anonymous';
            try {
                $orderService = new ChatbotOrderService();
                $result = $orderService->createOrder(
                    $selectedItems,
                    $orderChannel,
                    $newState,
                    $customerName,
                    $externalId
                );
                $order = $result['order'];
                $reference = $result['reference'];
                $newState['last_order_id'] = $order->id;
                $newState['last_order_reference'] = $reference;
                $newState['last_order_cart_fingerprint'] = $orderService->cartFingerprint($selectedItems);
                $newState['selected_items'] = [];
                $newState['current_state'] = 'main_menu';
                $reply = __('chatbot.order_placed_reference', ['reference' => $reference], $locale)
                    . "\n\n"
                    . __('chatbot.main_menu_prompt', [], $locale);
            } catch (ChatbotInventoryException $e) {
                $newState['current_state'] = 'confirm';
                $reply = __('chatbot.inventory_failure', [], $locale);
            }
        }

        $session->update([
            'state' => $newState,
            'language' => $newState['selected_language'] ?? $session->language,
            'saved_customer_name' => $newState['saved_customer_name'] ?? $session->saved_customer_name,
            'last_activity_at' => now(),
        ]);

        $replies = array_filter(explode("\n\n", $reply));
        if ($replies === []) {
            $replies = [$reply];
        }
        if ($currentState === 'welcome' && $nextState === 'language_selection' && count($replies) === 1) {
            array_unshift($replies, __('chatbot.greeting', [], $locale));
            $reply = implode("\n\n", $replies);
        }

        return response()->json([
            'reply' => $reply,
            'replies' => $replies,
            'state' => $newState,
        ]);
    }

    /**
     * @param mixed $raw
     * @return list<array{menu_item_id: int, name: string, price: float, quantity: int}>
     */
    private function normalizeSelectedItems($raw): array
    {
        if (! is_array($raw)) {
            return [];
        }
        $out = [];
        foreach ($raw as $i) {
            if (is_array($i) && isset($i['menu_item_id'], $i['name'], $i['price'])) {
                $out[] = [
                    'menu_item_id' => (int) $i['menu_item_id'],
                    'name' => (string) $i['name'],
                    'price' => (float) $i['price'],
                    'quantity' => (int) ($i['quantity'] ?? 1),
                ];
            }
        }
        return $out;
    }
}
