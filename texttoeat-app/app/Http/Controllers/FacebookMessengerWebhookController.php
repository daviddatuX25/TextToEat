<?php

namespace App\Http\Controllers;

use App\Contracts\MessengerSenderInterface;
use App\Events\ConversationUpdated;
use App\Messenger\MessengerPayloads;
use App\Messenger\MessengerReplyBuilder;
use App\Models\ChatbotSession;
use App\Models\DeliveryArea;
use App\Models\InboundMessage;
use App\Models\MenuItem;
use App\Models\Order;
use App\Messenger\FacebookMessengerClient;
use App\Services\MenuItemStockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class FacebookMessengerWebhookController extends Controller
{
    public function __construct(
        private MessengerSenderInterface $messengerSender,
        private ChatbotWebhookController $chatbot,
        private MessengerReplyBuilder $replyBuilder,
        private FacebookMessengerClient $messengerClient
    ) {}

    /**
     * @return Response|JsonResponse
     */
    public function verify(Request $request)
    {
        $mode = $request->query('hub_mode', $request->query('hub.mode'));
        $token = $request->query('hub_verify_token', $request->query('hub.verify_token'));
        $challenge = $request->query('hub_challenge', $request->query('hub.challenge'));

        if (! \is_string($mode) || ! \is_string($token) || ! \is_string($challenge)) {
            return response()->json(['error' => 'Missing verification parameters'], 400);
        }

        $expectedToken = (string) config('facebook.verify_token', '');
        if ($mode === 'subscribe' && $token === $expectedToken && $expectedToken !== '') {
            return response($challenge, 200)->header('Content-Type', 'text/plain');
        }

        return response()->json(['error' => 'Invalid verification token'], 403);
    }

    public function handle(Request $request): JsonResponse
    {
        if (! $this->isValidSignature($request)) {
            return response()->json(['error' => 'Invalid signature'], 403);
        }

        $payload = $request->all();
        $entries = $payload['entry'] ?? [];
        if (! \is_array($entries)) {
            return response()->json(['status' => 'ignored']);
        }

        foreach ($entries as $entry) {
            if (! \is_array($entry) || ! isset($entry['messaging']) || ! \is_array($entry['messaging'])) {
                continue;
            }

            foreach ($entry['messaging'] as $event) {
                $this->handleMessagingEvent($event);
            }
        }

        return response()->json(['status' => 'ok']);
    }

    /**
     * @param array<string, mixed> $event
     */
    private function handleMessagingEvent(array $event): void
    {
        if (! isset($event['sender']['id'])) {
            return;
        }

        if (isset($event['message']['is_echo']) && $event['message']['is_echo'] === true) {
            return;
        }

        $psid = (string) $event['sender']['id'];

        $text = null;
        if (isset($event['message']['quick_reply']['payload']) && \is_string($event['message']['quick_reply']['payload'])) {
            $text = $event['message']['quick_reply']['payload'];
        } elseif (isset($event['message']['text']) && \is_string($event['message']['text'])) {
            $text = $event['message']['text'];
        } elseif (isset($event['postback']['payload']) && \is_string($event['postback']['payload'])) {
            $text = $event['postback']['payload'];
        }

        if ($text === null || $text === '') {
            return;
        }

        $body = MessengerPayloads::toFsmBody($text);

        $existingSession = ChatbotSession::where('channel', 'messenger')
            ->where('external_id', $psid)
            ->first();
        if ($existingSession !== null) {
            $state = $existingSession->state ?? [];
            if ((bool) ($state['automation_disabled'] ?? false) === true) {
                $existingSession->update(['last_activity_at' => now()]);
                InboundMessage::create([
                    'chatbot_session_id' => $existingSession->id,
                    'body' => $body,
                    'channel' => 'messenger',
                ]);
                event(new ConversationUpdated($existingSession, 'message'));

                return;
            }
        }

        $currentState = $existingSession !== null
            ? (($existingSession->state ?? [])['current_state'] ?? 'welcome')
            : 'welcome';

        $chatbotRequest = Request::create(
            '/api/chatbot/webhook',
            'POST',
            [
                'channel' => 'messenger',
                'external_id' => $psid,
                'body' => $body,
            ]
        );

        $response = $this->chatbot->webhook($chatbotRequest);
        $data = $response->getData(true);

        $newState = $data['state'] ?? [];
        $nextState = $newState['current_state'] ?? 'main_menu';
        $locale = $newState['selected_language'] ?? ($existingSession?->language ?? 'en');
        $replies = $data['replies'] ?? null;
        $reply = $data['reply'] ?? '';
        $fullReply = $reply;

        if (\is_array($replies) && $replies !== [] && count($replies) > 1) {
            foreach (array_slice($replies, 0, -1) as $replyText) {
                if (\is_string($replyText) && $replyText !== '') {
                    $this->messengerClient->sendTextMessage($psid, $replyText);
                }
            }
            $reply = (string) end($replies);
        } elseif (\is_array($replies) && $replies !== []) {
            $reply = (string) ($replies[0] ?? $reply);
        }

        if ($reply === '') {
            return;
        }

        $menuItems = $this->loadMenuItems();
        $deliveryAreas = $this->loadDeliveryAreas();

        $replyForBuild = $nextState === 'menu' ? $fullReply : $reply;
        $descriptors = $this->replyBuilder->build(
            $currentState,
            $nextState,
            $replyForBuild,
            $newState,
            $menuItems,
            $deliveryAreas,
            $locale
        );

        foreach ($descriptors as $desc) {
            $type = $desc['type'] ?? 'text';
            $text = $desc['text'] ?? '';
            if ($type === 'quick_reply' && isset($desc['options'])) {
                $this->messengerClient->sendQuickReply($psid, $text, $desc['options']);
            } elseif ($type === 'button_template' && isset($desc['buttons'])) {
                $this->messengerClient->sendButtonTemplate($psid, $text, $desc['buttons']);
            } elseif ($type === 'carousel' && isset($desc['elements']) && $desc['elements'] !== []) {
                if ($text !== '') {
                    $this->messengerClient->sendTextMessage($psid, $text);
                }
                $this->messengerClient->sendCarousel($psid, $desc['elements']);
            } elseif ($text !== '') {
                $this->messengerClient->sendTextMessage($psid, $text);
            }
        }

        $orderJustPlaced = $currentState === 'confirm'
            && $nextState === 'main_menu'
            && isset($newState['last_order_id']);
        if ($orderJustPlaced) {
            $orderId = $newState['last_order_id'];
            $order = Order::with('orderItems')->find($orderId);
            if ($order !== null) {
                $receiptPayload = $this->buildReceiptPayload($order);
                if ($receiptPayload !== []) {
                    $this->messengerClient->sendReceiptTemplate($psid, $receiptPayload);
                }
            }
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function buildReceiptPayload(Order $order): array
    {
        $elements = [];
        foreach ($order->orderItems as $item) {
            $elements[] = [
                'title' => mb_substr((string) $item->name, 0, 80),
                'subtitle' => 'Qty: ' . ((int) $item->quantity),
                'quantity' => (int) $item->quantity,
                'price' => (float) $item->price,
                'currency' => 'PHP',
            ];
        }
        if ($elements === []) {
            return [];
        }
        $total = (float) $order->total;

        return [
            'recipient_name' => mb_substr((string) ($order->customer_name ?? 'Customer'), 0, 128),
            'order_number' => (string) ($order->reference ?? $order->id),
            'currency' => 'PHP',
            'payment_method' => 'Cash',
            'summary' => [
                'subtotal' => $total,
                'shipping_cost' => 0,
                'total_tax' => 0,
                'total_cost' => $total,
            ],
            'elements' => $elements,
        ];
    }

    /**
     * @return array<int, array{id: int, name: string, price: float, category?: string}>
     */
    private function loadMenuItems(): array
    {
        $todayMenuItems = MenuItem::forToday()->get();
        $virtualAvailable = app(MenuItemStockService::class)->getVirtualAvailableForToday($todayMenuItems->pluck('id')->all());
        $categoryOrder = array_flip(config('menu.categories', []));

        return $todayMenuItems
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
    }

    /**
     * @return array<int, array{id: int, name: string, is_free: bool, fee: float|null}>
     */
    private function loadDeliveryAreas(): array
    {
        return DeliveryArea::query()
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
    }

    private function isValidSignature(Request $request): bool
    {
        $signatureHeader = $request->header('X-Hub-Signature-256');
        if (! \is_string($signatureHeader) || $signatureHeader === '') {
            return false;
        }

        $appSecret = (string) config('facebook.app_secret', '');
        if ($appSecret === '') {
            return false;
        }

        $rawBody = $request->getContent();
        $expected = 'sha256=' . hash_hmac('sha256', $rawBody, $appSecret);

        return hash_equals($expected, $signatureHeader);
    }
}

