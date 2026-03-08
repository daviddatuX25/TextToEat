<?php

namespace App\Http\Controllers;

use App\Chatbot\ChatbotFsm;
use App\Chatbot\ChatbotInventoryException;
use App\Chatbot\ChatbotOrderService;
use App\Events\ConversationUpdated;
use App\Models\ChatbotSession;
use App\Models\Conversation;
use App\Models\DeliveryArea;
use App\Models\InboundMessage;
use App\Models\MenuItem;
use App\Models\OutboundMessenger;
use App\Models\OutboundSms;
use App\Services\ChatbotReplyResolver;
use App\Services\ChatbotSmsNumberLayer;
use App\Services\MenuItemStockService;
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

        $resolver = app(ChatbotReplyResolver::class);
        if ($session === null) {
            $replies = [
                $resolver->get('greeting', $locale),
                $resolver->get('welcome', $locale),
            ];
            if (\in_array($channel, ['web', 'sms'], true)) {
                $formattedLanguage = app(ChatbotSmsNumberLayer::class)->formatChoiceStateReply('language_selection', $locale);
                if ($formattedLanguage !== null) {
                    $replies[] = $formattedLanguage;
                }
            }
            $state = ['current_state' => 'language_selection'];
        } else {
            $replies = [
                $resolver->get('greeting', $locale),
                $resolver->get('main_menu_prompt', $locale),
            ];
            $state = $session->state ?? [];
            // Web/SMS: show numbered options for main menu so user is not left with only "What would you like to do?"
            if (\in_array($channel, ['web', 'sms'], true)) {
                $formattedMainMenu = app(ChatbotSmsNumberLayer::class)->formatChoiceStateReply('main_menu', $locale);
                if ($formattedMainMenu !== null) {
                    $replies[1] = $formattedMainMenu;
                }
            }
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

        $todayMenuItems = MenuItem::forToday()->get();
        $virtualAvailable = app(MenuItemStockService::class)->getVirtualAvailableForToday($todayMenuItems->pluck('id')->all());
        $categoryOrder = array_flip(config('menu.categories', []));
        $menuItems = $todayMenuItems
            ->sort(function ($a, $b) use ($categoryOrder) {
                $ca = $categoryOrder[$a->category] ?? 999;
                $cb = $categoryOrder[$b->category] ?? 999;
                if ($ca !== $cb) {
                    return $ca <=> $cb;
                }
                return strcmp($a->name, $b->name);
            })
            ->values()
            ->map(fn ($m) => [
                'id' => $m->id,
                'name' => $m->name,
                'price' => (float) $m->price,
                'category' => $m->category ?? '',
                'available' => (int) ($virtualAvailable[$m->id] ?? 0),
            ])
            ->all();

        $state['virtual_available'] = $virtualAvailable;

        $deliveryAreas = DeliveryArea::query()
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'name' => $a->name,
                'is_free' => (bool) $a->is_free,
                'fee' => $a->fee !== null ? (float) $a->fee : null,
            ])
            ->values()
            ->all();

        if ($currentState === 'human_takeover') {
            InboundMessage::create([
                'chatbot_session_id' => $session->id,
                'body' => $body,
                'channel' => $channel,
            ]);
        }

        // Translation layer (number → canonical) only for SMS/Web. Messenger sends canonical body from payload mapping.
        if (\in_array($channel, ['sms', 'web'], true)) {
            $layerContext = ['delivery_areas' => $deliveryAreas];
            if ($currentState === 'item_selection' && isset($state['item_selection_mode'])) {
                $layerContext['item_selection_mode'] = $state['item_selection_mode'];
            }
            $body = app(ChatbotSmsNumberLayer::class)->normalizeBodyForChoiceState($currentState, $body, $layerContext);
        }

        $fsm = new ChatbotFsm();
        [$nextState, $reply, $statePayload] = $fsm->transition(
            $currentState,
            $body,
            $state,
            $menuItems,
            $deliveryAreas,
            $locale,
            $externalId,
            $channel
        );

        $newState = array_merge($state, ['current_state' => $nextState], $statePayload);

        if ($currentState === 'human_takeover' && $nextState === 'main_menu') {
            $newState['automation_disabled'] = false;
        }

        if ($nextState === 'human_takeover' && $currentState !== 'human_takeover') {
            Conversation::create([
                'chatbot_session_id' => $session->id,
                'channel' => $channel,
                'external_id' => $externalId,
                'status' => 'human_takeover',
            ]);
        }

        if ($nextState === 'order_placed') {
            $selectedItems = $this->normalizeSelectedItems($newState['selected_items'] ?? []);
            $customerName = $newState['customer_name'] ?? 'Anonymous';
            // Block order creation when using simulator/system IDs; only real SMS phone or Messenger PSID may place orders
            $isSimulatorId = str_starts_with($externalId, 'sim_') || str_starts_with($externalId, 'web_');
            $resolver = app(ChatbotReplyResolver::class);
            if ($isSimulatorId) {
                $newState['current_state'] = 'confirm';
                $reply = $resolver->get('use_real_phone_or_messenger', $locale);
            } else {
                try {
                    $orderService = app(ChatbotOrderService::class);
                    $result = $orderService->createOrder(
                        $selectedItems,
                        $channel,
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
                    $reply = $resolver->get('order_placed_reference', $locale, ['reference' => $reference])
                        . "\n\n"
                        . $resolver->get('main_menu_prompt', $locale);
                } catch (ChatbotInventoryException $e) {
                    $newState['current_state'] = 'confirm';
                    $reply = $resolver->get('inventory_failure', $locale);
                }
            }
        }

        $update = [
            'state' => $newState,
            'language' => $newState['selected_language'] ?? $session->language,
            'saved_customer_name' => $newState['saved_customer_name'] ?? $session->saved_customer_name,
            'last_activity_at' => now(),
        ];

        if ($nextState === 'order_placed') {
            if (array_key_exists('delivery_type', $newState)) {
                $update['saved_delivery_type'] = $newState['delivery_type'];
            }
            if (array_key_exists('delivery_place', $newState)) {
                $update['saved_delivery_place'] = $newState['delivery_place'];
            }
            if (array_key_exists('delivery_fee', $newState)) {
                $update['saved_delivery_fee'] = $newState['delivery_fee'];
            }
        }

        $session->update($update);
        event(new ConversationUpdated($session));

        $replies = array_filter(explode("\n\n", $reply));
        if ($replies === []) {
            $replies = [$reply];
        }
        if ($currentState === 'welcome' && $nextState === 'language_selection' && count($replies) === 1) {
            array_unshift($replies, app(ChatbotReplyResolver::class)->get('greeting', $locale));
            $reply = implode("\n\n", $replies);
        }

        // Web, SMS, and (where applicable) Messenger: ensure choice-state replies include formatted options (numbering).
        // delivery_choice on Messenger is button-only; delivery_area_choice and other choice states get numbering on all channels.
        $effectiveState = $newState['current_state'] ?? $nextState;
        $effectiveLocale = $newState['selected_language'] ?? $locale;
        if ($effectiveState !== null) {
            $smsLayer = app(ChatbotSmsNumberLayer::class);
            $context = [
                'channel' => $channel,
                'delivery_areas' => \in_array($effectiveState, ['delivery_choice', 'delivery_area_choice'], true) ? $deliveryAreas : null,
                'item_selection_mode' => $newState['item_selection_mode'] ?? null,
            ];
            if ($effectiveState === 'collect_name' && isset($newState['saved_customer_name'])) {
                $context['saved_customer_name'] = $newState['saved_customer_name'];
            }
            $result = $smsLayer->ensureChoiceStateOptionsInReplies($replies, $effectiveState, $effectiveLocale, $context);
            $replies = $result['replies'];
            $reply = $result['reply'];
        }

        // Replace __CART_FOOTER__ and __EDIT_ACTION_OPTIONS__ placeholders with numbered options (SMS/Web only; Messenger never touches layer).
        if (\in_array($channel, ['sms', 'web'], true)) {
            $itemSelectionMode = $newState['item_selection_mode'] ?? null;
            $reply = app(ChatbotSmsNumberLayer::class)->replacePlaceholdersInReply($reply, $effectiveLocale ?? $locale, $channel, $itemSelectionMode);
            $replies = array_filter(explode("\n\n", $reply));
            if ($replies === []) {
                $replies = [$reply];
            }
        }

        $payload = [
            'reply' => $reply,
            'replies' => $replies,
            'state' => $newState,
        ];
        if (in_array($newState['current_state'] ?? '', ['delivery_choice', 'delivery_area_choice'], true)) {
            $payload['delivery_areas'] = $deliveryAreas;
        }
        return response()->json($payload);
    }

    public function outboundMessages(Request $request): JsonResponse
    {
        $channel = $request->query('channel');
        $externalId = $request->query('external_id');
        if (! \in_array($channel, ['sms', 'messenger'], true) || ! \is_string($externalId) || $externalId === '') {
            return response()->json(['message' => 'channel and external_id are required'], 422);
        }

        if ($channel === 'sms') {
            $rows = OutboundSms::query()
                ->where('to', $externalId)
                ->where('channel', 'sms')
                ->orderByDesc('created_at')
                ->limit(30)
                ->get(['id', 'body', 'created_at']);
        } else {
            $rows = OutboundMessenger::query()
                ->where('to', $externalId)
                ->orderByDesc('created_at')
                ->limit(30)
                ->get(['id', 'body', 'created_at']);
        }

        $messages = $rows->map(fn ($r) => [
            'id' => $r->id,
            'body' => $r->body,
            'created_at' => $r->created_at->toIso8601String(),
        ])->values()->all();

        return response()->json(['messages' => $messages]);
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
