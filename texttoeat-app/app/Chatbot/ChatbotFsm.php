<?php

namespace App\Chatbot;

/**
 * FSM for chatbot: welcome → language_selection → menu → item_selection → confirm → order_placed.
 * States: welcome, language_selection, menu, item_selection, confirm, order_placed, human_takeover.
 * Uses $menuItems (id, name, price) for numbered menu; $locale for all replies.
 */
class ChatbotFsm
{
    private ChatbotKeywordMatcher $keywordMatcher;

    public function __construct(?ChatbotKeywordMatcher $keywordMatcher = null)
    {
        $this->keywordMatcher = $keywordMatcher ?? new ChatbotKeywordMatcher();
    }

    /**
     * @param array<string, mixed> $statePayload
     * @param array<int, array{id: int, name: string, price: float}> $menuItems
     * @return array{string, string, array<string, mixed>} [next_state, reply, state_payload]
     */
    public function transition(
        string $currentState,
        string $body,
        array $statePayload,
        array $menuItems = [],
        string $locale = 'en'
    ): array {
        $body = trim($body);
        $bodyLower = strtolower($body);

        return match ($currentState) {
            'welcome' => $this->fromWelcome($locale),
            'language_selection' => $this->fromLanguageSelection($body, $statePayload, $menuItems, $locale),
            'main_menu' => $this->fromMainMenu($body, $statePayload, $menuItems, $locale),
            'menu' => $this->fromMenu($body, $statePayload, $menuItems, $locale),
            'item_selection' => $this->fromItemSelection($body, $statePayload, $menuItems, $locale),
            'collect_name' => $this->fromCollectName($body, $statePayload, $menuItems, $locale),
            'delivery_choice' => $this->fromDeliveryChoice($body, $statePayload, $menuItems, $locale),
            'confirm' => $this->fromConfirm($body, $statePayload, $menuItems, $locale),
            'order_placed' => $this->fromOrderPlaced($body, $menuItems, $locale),
            'human_takeover' => $this->fromHumanTakeover($body, $locale),
            default => $this->fromWelcome($locale),
        };
    }

    /**
     * @return array{string, string, array<string, mixed>}
     */
    private function fromWelcome(string $locale): array
    {
        return [
            'language_selection',
            __('chatbot.welcome', [], $locale),
            [],
        ];
    }

    /**
     * @param array<string, mixed> $statePayload
     * @param array<int, array{id: int, name: string, price: float}> $menuItems
     * @return array{string, string, array<string, mixed>}
     */
    private function fromLanguageSelection(string $body, array $statePayload, array $menuItems, string $locale): array
    {
        $keyword = $this->keywordMatcher->match($body);
        if ($keyword === 'help') {
            return [
                'language_selection',
                __('chatbot.help_text', [], $locale),
                [],
            ];
        }

        $langMap = ['1' => 'en', '2' => 'tl', '3' => 'ilo'];
        $lang = $langMap[$body] ?? null;
        if ($lang === null) {
            return [
                'language_selection',
                __('chatbot.invalid_language', [], $locale),
                [],
            ];
        }

        return [
            'main_menu',
            __('chatbot.main_menu_prompt', [], $lang),
            ['selected_language' => $lang],
        ];
    }

    /**
     * @param array<string, mixed> $statePayload
     * @param array<int, array{id: int, name: string, price: float}> $menuItems
     * @return array{string, string, array<string, mixed>}
     */
    private function fromMainMenu(string $body, array $statePayload, array $menuItems, string $locale): array
    {
        $keyword = $this->keywordMatcher->match($body);
        if ($keyword === 'help') {
            return [
                'main_menu',
                __('chatbot.main_menu_prompt', [], $locale),
                [],
            ];
        }
        if ($keyword === 'human_takeover') {
            return [
                'human_takeover',
                __('chatbot.human_takeover_reply', [], $locale),
                [],
            ];
        }
        $intent = $this->keywordMatcher->matchIntent($body, ['order', 'track', 'language']);
        if ($intent === 'order') {
            $menuText = $this->buildMenuText($menuItems, $locale);
            return [
                'menu',
                __('chatbot.menu_header', [], $locale) . $menuText,
                [],
            ];
        }
        if ($intent === 'track') {
            return [
                'main_menu',
                __('chatbot.track_ask_reference', [], $locale),
                [],
            ];
        }
        if ($intent === 'language') {
            return [
                'language_selection',
                __('chatbot.language_prompt', [], $locale),
                [],
            ];
        }
        if ($body === '1') {
            $menuText = $this->buildMenuText($menuItems, $locale);
            return [
                'menu',
                __('chatbot.menu_header', [], $locale) . $menuText,
                [],
            ];
        }
        if ($body === '2') {
            return [
                'main_menu',
                __('chatbot.track_ask_reference', [], $locale),
                [],
            ];
        }
        if ($body === '3') {
            return [
                'language_selection',
                __('chatbot.language_prompt', [], $locale),
                [],
            ];
        }
        return [
            'main_menu',
            __('chatbot.main_menu_invalid', [], $locale) . ' ' . __('chatbot.main_menu_prompt', [], $locale),
            [],
        ];
    }

    /**
     * @param array<string, mixed> $statePayload
     * @param array<int, array{id: int, name: string, price: float}> $menuItems
     * @return array{string, string, array<string, mixed>}
     */
    private function fromMenu(string $body, array $statePayload, array $menuItems, string $locale): array
    {
        $keyword = $this->keywordMatcher->match($body);
        if ($keyword !== null) {
            return $this->handleKeywordInState($keyword, $statePayload, $menuItems, $locale, 'menu');
        }

        $bodyLower = strtolower(trim($body));
        if ($bodyLower === 'done') {
            $selectedItems = $this->normalizeSelectedItems($statePayload['selected_items'] ?? []);
            if (empty($selectedItems)) {
                $menuText = $this->buildMenuText($menuItems, $locale);
                return [
                    'menu',
                    __('chatbot.done_empty', [], $locale) . ' ' . $menuText,
                    [],
                ];
            }
        }

        $menuText = $this->buildMenuText($menuItems, $locale);
        $idx = (int) $body;
        $oneBased = $idx >= 1 && $idx <= count($menuItems) ? $idx : 0;
        if ($oneBased === 0) {
            return [
                'menu',
                __('chatbot.invalid_option_menu', [], $locale) . ' ' . $menuText,
                [],
            ];
        }

        $item = $menuItems[$oneBased - 1];
        return [
            'item_selection',
            __('chatbot.quantity_prompt', ['name' => $item['name']], $locale),
            [
                'pending_item' => $item,
                'item_selection_mode' => 'await_quantity',
            ],
        ];
    }

    /**
     * @param array<string, mixed> $statePayload
     * @param array<int, array{id: int, name: string, price: float}> $menuItems
     * @return array{string, string, array<string, mixed>}
     */
    private function fromItemSelection(string $body, array $statePayload, array $menuItems, string $locale): array
    {
        $keyword = $this->keywordMatcher->match($body);
        if ($keyword !== null) {
            return $this->handleKeywordInState($keyword, $statePayload, $menuItems, $locale, 'item_selection');
        }

        $bodyLower = strtolower(trim($body));
        $selectedItems = $this->normalizeSelectedItems($statePayload['selected_items'] ?? []);
        $mode = (string) ($statePayload['item_selection_mode'] ?? 'cart_menu');

        if (($statePayload['pending_item'] ?? null) !== null && $mode === 'await_quantity') {
            $qty = (int) $body;
            if ($qty <= 0) {
                return [
                    'item_selection',
                    __('chatbot.invalid_quantity', [], $locale),
                    [],
                ];
            }
            $pending = $statePayload['pending_item'];
            if (! is_array($pending) || ! isset($pending['id'], $pending['name'], $pending['price'])) {
                $menuText = $this->buildMenuText($menuItems, $locale);
                return ['menu', __('chatbot.menu_header', [], $locale) . $menuText, []];
            }
            $found = false;
            foreach ($selectedItems as $index => $line) {
                if ($line['menu_item_id'] === (int) $pending['id']) {
                    $selectedItems[$index]['quantity'] = (int) $selectedItems[$index]['quantity'] + $qty;
                    $found = true;
                    break;
                }
            }
            if (! $found) {
                $selectedItems[] = [
                    'menu_item_id' => (int) $pending['id'],
                    'name' => (string) $pending['name'],
                    'price' => (float) $pending['price'],
                    'quantity' => $qty,
                ];
            }
            $summary = $this->buildCartSummary($selectedItems, $locale);
            return [
                'item_selection',
                __('chatbot.cart_menu_prompt', ['summary' => $summary], $locale),
                [
                    'selected_items' => $selectedItems,
                    'pending_item' => null,
                    'item_selection_mode' => 'cart_menu',
                ],
            ];
        }

        if ($bodyLower === 'done' || $bodyLower === '4') {
            if (empty($selectedItems)) {
                $menuText = $this->buildMenuText($menuItems, $locale);
                return [
                    'menu',
                    __('chatbot.done_empty', [], $locale) . ' ' . $menuText,
                    [],
                ];
            }
            $savedName = $statePayload['saved_customer_name'] ?? null;
            $prompt = ($savedName !== null && $savedName !== '')
                ? __('chatbot.collect_name_prompt_with_saved', ['name' => $savedName], $locale)
                : __('chatbot.collect_name_prompt', [], $locale);
            return [
                'collect_name',
                $prompt,
                ['selected_items' => $selectedItems],
            ];
        }

        if ($bodyLower === '1') {
            $menuText = $this->buildMenuText($menuItems, $locale);
            return [
                'menu',
                __('chatbot.menu_header', [], $locale) . $menuText,
                ['item_selection_mode' => 'cart_menu'],
            ];
        }

        if ($bodyLower === '2') {
            $summary = $this->buildCartSummary($selectedItems, $locale);
            return [
                'item_selection',
                $summary,
                ['item_selection_mode' => 'cart_menu'],
            ];
        }

        if ($bodyLower === '3') {
            if (empty($selectedItems)) {
                $menuText = $this->buildMenuText($menuItems, $locale);
                return [
                    'menu',
                    __('chatbot.done_empty', [], $locale) . ' ' . $menuText,
                    [],
                ];
            }
            $summary = $this->buildCartSummary($selectedItems, $locale);
            return [
                'item_selection',
                __('chatbot.cart_edit_select_prompt', ['summary' => $summary], $locale),
                ['item_selection_mode' => 'edit_select'],
            ];
        }

        if ($mode === 'edit_select') {
            $index = (int) $body;
            if ($index < 1 || $index > count($selectedItems)) {
                $summary = $this->buildCartSummary($selectedItems, $locale);
                return [
                    'item_selection',
                    __('chatbot.cart_edit_invalid_index', ['summary' => $summary], $locale),
                    ['item_selection_mode' => 'edit_select'],
                ];
            }
            $line = $selectedItems[$index - 1];
            return [
                'item_selection',
                __('chatbot.cart_edit_quantity_prompt', [
                    'name' => $line['name'],
                    'quantity' => $line['quantity'],
                ], $locale),
                [
                    'item_selection_mode' => 'edit_quantity',
                    'edit_index' => $index - 1,
                ],
            ];
        }

        if ($mode === 'edit_quantity' && array_key_exists('edit_index', $statePayload)) {
            $editIndex = (int) $statePayload['edit_index'];
            if (! isset($selectedItems[$editIndex])) {
                $summary = $this->buildCartSummary($selectedItems, $locale);
                return [
                    'item_selection',
                    __('chatbot.cart_edit_invalid_index', ['summary' => $summary], $locale),
                    ['item_selection_mode' => 'cart_menu'],
                ];
            }
            $qty = (int) $body;
            if ($qty <= 0) {
                array_splice($selectedItems, $editIndex, 1);
            } else {
                $selectedItems[$editIndex]['quantity'] = $qty;
            }
            $summary = $this->buildCartSummary($selectedItems, $locale);
            return [
                'item_selection',
                __('chatbot.cart_menu_prompt', ['summary' => $summary], $locale),
                [
                    'selected_items' => $selectedItems,
                    'item_selection_mode' => 'cart_menu',
                ],
            ];
        }

        $summary = $this->buildCartSummary($selectedItems, $locale);
        return [
            'item_selection',
            __('chatbot.cart_invalid_option', ['summary' => $summary], $locale),
            [],
        ];
    }

    /**
     * @param array<string, mixed> $statePayload
     * @param array<int, array{id: int, name: string, price: float}> $menuItems
     * @return array{string, string, array<string, mixed>}
     */
    private function fromCollectName(string $body, array $statePayload, array $menuItems, string $locale): array
    {
        $keyword = $this->keywordMatcher->match($body);
        $savedName = $statePayload['saved_customer_name'] ?? null;
        $collectPrompt = ($savedName !== null && $savedName !== '')
            ? __('chatbot.collect_name_prompt_with_saved', ['name' => $savedName], $locale)
            : __('chatbot.collect_name_prompt', [], $locale);

        if ($keyword === 'help') {
            return [
                'collect_name',
                $collectPrompt,
                [],
            ];
        }
        if ($keyword === 'human_takeover') {
            return [
                'human_takeover',
                __('chatbot.human_takeover_reply', [], $locale),
                [],
            ];
        }

        $trimmed = trim($body);
        if ($trimmed === '') {
            return [
                'collect_name',
                $collectPrompt,
                [],
            ];
        }

        if ($trimmed === '1' && $savedName !== null && $savedName !== '') {
            $selectedItems = $this->normalizeSelectedItems($statePayload['selected_items'] ?? []);
            return [
                'delivery_choice',
                __('chatbot.delivery_choice_prompt', [], $locale),
                [
                    'selected_items' => $selectedItems,
                    'customer_name' => $savedName,
                ],
            ];
        }

        $customerName = $this->keywordMatcher->matchIntent($trimmed, ['anonymous']) === 'anonymous'
            ? 'Anonymous'
            : $trimmed;

        $selectedItems = $this->normalizeSelectedItems($statePayload['selected_items'] ?? []);
        $payload = [
            'selected_items' => $selectedItems,
            'customer_name' => $customerName,
        ];
        if ($customerName !== 'Anonymous') {
            $payload['saved_customer_name'] = $customerName;
        }
        return [
            'delivery_choice',
            __('chatbot.delivery_choice_prompt', [], $locale),
            $payload,
        ];
    }

    /**
     * @param array<string, mixed> $statePayload
     * @param array<int, array{id: int, name: string, price: float}> $menuItems
     * @return array{string, string, array<string, mixed>}
     */
    private function fromDeliveryChoice(string $body, array $statePayload, array $menuItems, string $locale): array
    {
        $keyword = $this->keywordMatcher->match($body);
        if ($keyword === 'help') {
            return [
                'delivery_choice',
                __('chatbot.delivery_choice_prompt', [], $locale),
                [],
            ];
        }
        if ($keyword === 'human_takeover') {
            return [
                'human_takeover',
                __('chatbot.human_takeover_reply', [], $locale),
                [],
            ];
        }

        $selectedItems = $this->normalizeSelectedItems($statePayload['selected_items'] ?? []);
        $summary = $this->buildCartSummary($selectedItems, $locale);
        $bodyTrim = trim($body);
        $payload = [
            'selected_items' => $selectedItems,
            'customer_name' => $statePayload['customer_name'] ?? 'Anonymous',
        ];

        $intent = $this->keywordMatcher->matchIntent($body, ['pickup', 'delivery']);
        if ($intent === 'pickup') {
            $payload['delivery_type'] = 'pickup';
            $payload['delivery_place'] = null;
            $payload['delivery_fee'] = 0;
            return [
                'confirm',
                __('chatbot.confirm_prompt', ['summary' => $summary], $locale),
                $payload,
            ];
        }
        if ($intent === 'delivery') {
            return [
                'delivery_choice',
                __('chatbot.delivery_choice_prompt', [], $locale),
                [
                    'selected_items' => $selectedItems,
                    'customer_name' => $statePayload['customer_name'] ?? 'Anonymous',
                ],
            ];
        }

        if ($bodyTrim === '1') {
            $payload['delivery_type'] = 'pickup';
            $payload['delivery_place'] = null;
            $payload['delivery_fee'] = 0;
            return [
                'confirm',
                __('chatbot.confirm_prompt', ['summary' => $summary], $locale),
                $payload,
            ];
        }
        if ($bodyTrim === '2') {
            $payload['delivery_type'] = 'delivery';
            $payload['delivery_place'] = 'Municipal Hall';
            $payload['delivery_fee'] = 0;
            return [
                'confirm',
                __('chatbot.confirm_prompt', ['summary' => $summary], $locale),
                $payload,
            ];
        }
        if ($bodyTrim === '3') {
            $payload['delivery_type'] = 'delivery';
            $payload['delivery_place'] = 'Within Barangay Tagudin';
            $payload['delivery_fee'] = 0;
            return [
                'confirm',
                __('chatbot.confirm_prompt', ['summary' => $summary], $locale),
                $payload,
            ];
        }
        if ($bodyTrim === '4') {
            $payload['delivery_type'] = 'delivery';
            $payload['delivery_place'] = 'Other (paid on delivery)';
            $payload['delivery_fee'] = null;
            return [
                'confirm',
                __('chatbot.confirm_prompt', ['summary' => $summary], $locale),
                $payload,
            ];
        }

        return [
            'delivery_choice',
            __('chatbot.delivery_choice_invalid', [], $locale) . ' ' . __('chatbot.delivery_choice_prompt', [], $locale),
            [
                'selected_items' => $selectedItems,
                'customer_name' => $statePayload['customer_name'] ?? 'Anonymous',
            ],
        ];
    }

    /**
     * @param array<string, mixed> $statePayload
     * @param array<int, array{id: int, name: string, price: float}> $menuItems
     * @return array{string, string, array<string, mixed>}
     */
    private function fromConfirm(string $body, array $statePayload, array $menuItems, string $locale): array
    {
        $keyword = $this->keywordMatcher->match($body);
        if ($keyword !== null) {
            return $this->handleKeywordInState($keyword, $statePayload, $menuItems, $locale, 'confirm');
        }

        $bodyLower = strtolower(trim($body));
        if ($bodyLower === 'yes' || $bodyLower === '1') {
            $selectedItems = $this->normalizeSelectedItems($statePayload['selected_items'] ?? []);
            if (empty($selectedItems)) {
                $menuText = $this->buildMenuText($menuItems, $locale);
                return [
                    'menu',
                    __('chatbot.done_empty', [], $locale) . ' ' . $menuText,
                    ['selected_items' => []],
                ];
            }
            return [
                'order_placed',
                __('chatbot.order_placed', [], $locale),
                [],
            ];
        }
        if ($bodyLower === 'no') {
            $menuText = $this->buildMenuText($menuItems, $locale);
            return [
                'menu',
                __('chatbot.cancel_ok', [], $locale) . ' ' . $menuText,
                ['selected_items' => []],
            ];
        }

        return [
            'confirm',
            __('chatbot.confirm_invalid', [], $locale),
            [],
        ];
    }

    /**
     * @param array<int, array{id: int, name: string, price: float}> $menuItems
     * @return array{string, string, array<string, mixed>}
     */
    private function fromOrderPlaced(string $body, array $menuItems, string $locale): array
    {
        return [
            'main_menu',
            __('chatbot.main_menu_prompt', [], $locale),
            ['selected_items' => []],
        ];
    }

    /**
     * @return array{string, string, array<string, mixed>}
     */
    private function fromHumanTakeover(string $body, string $locale): array
    {
        return [
            'human_takeover',
            __('chatbot.human_takeover_reply', [], $locale),
            [],
        ];
    }

    /**
     * @param array<string, mixed> $statePayload
     * @param array<int, array{id: int, name: string, price: float}> $menuItems
     * @return array{string, string, array<string, mixed>}
     */
    private function handleKeywordInState(
        string $keyword,
        array $statePayload,
        array $menuItems,
        string $locale,
        string $currentState
    ): array {
        if ($keyword === 'main_menu') {
            return [
                'main_menu',
                __('chatbot.main_menu_prompt', [], $locale),
                [],
            ];
        }
        if ($keyword === 'help') {
            $menuText = in_array($currentState, ['menu', 'item_selection'], true)
                ? ' ' . $this->buildMenuText($menuItems, $locale)
                : '';
            return [
                $currentState,
                __('chatbot.help_text', [], $locale) . $menuText,
                [],
            ];
        }
        if ($keyword === 'menu') {
            $menuText = $this->buildMenuText($menuItems, $locale);
            return [
                'menu',
                __('chatbot.menu_header', [], $locale) . $menuText,
                ['selected_items' => []],
            ];
        }
        if ($keyword === 'cancel') {
            $menuText = $this->buildMenuText($menuItems, $locale);
            return [
                'menu',
                __('chatbot.cancel_ok', [], $locale) . ' ' . $menuText,
                ['selected_items' => []],
            ];
        }
        if ($keyword === 'status') {
            $menuText = in_array($currentState, ['menu', 'item_selection'], true)
                ? ' ' . $this->buildMenuText($menuItems, $locale)
                : '';
            return [
                $currentState,
                __('chatbot.status_none', [], $locale) . $menuText,
                [],
            ];
        }
        if ($keyword === 'human_takeover') {
            return [
                'human_takeover',
                __('chatbot.human_takeover_reply', [], $locale),
                [],
            ];
        }
        $menuText = $this->buildMenuText($menuItems, $locale);
        return [
            $currentState,
            __('chatbot.invalid_option_menu', [], $locale) . ' ' . $menuText,
            [],
        ];
    }

    /**
     * @param array<int, array{id: int, name: string, price: float}> $menuItems
     */
    public function buildMenuTextPublic(array $menuItems, string $locale): string
    {
        return $this->buildMenuText($menuItems, $locale);
    }

    /**
     * @param array<int, array{id: int, name: string, price: float}> $menuItems
     */
    private function buildMenuText(array $menuItems, string $locale): string
    {
        if (empty($menuItems)) {
            return __('chatbot.no_menu_today', [], $locale);
        }
        $lines = [];
        foreach ($menuItems as $n => $item) {
            $num = $n + 1;
            $price = number_format((float) $item['price'], 2);
            $lines[] = "{$num}. {$item['name']} - {$price}";
        }
        $lines[] = __('chatbot.menu_footer', [], $locale);

        return implode("\n", $lines);
    }

    /**
     * @param list<array{menu_item_id: int, name: string, price: float, quantity: int}> $selectedItems
     */
    private function buildCartSummary(array $selectedItems, string $locale): string
    {
        if (empty($selectedItems)) {
            return __('chatbot.cart_empty', [], $locale);
        }
        $lines = [__('chatbot.cart_header', [], $locale)];
        $total = 0.0;
        foreach ($selectedItems as $index => $item) {
            $q = (int) $item['quantity'];
            $price = (float) $item['price'];
            $sub = $q * $price;
            $total += $sub;
            $num = $index + 1;
            $subtotal = number_format($sub, 2);
            $line = $q === 1
                ? __('chatbot.cart_line_one', ['name' => $item['name'], 'subtotal' => $subtotal], $locale)
                : __('chatbot.cart_line', ['name' => $item['name'], 'count' => $q, 'subtotal' => $subtotal], $locale);
            $lines[] = "{$num}. {$line}";
        }
        $lines[] = __('chatbot.cart_total', ['total' => number_format($total, 2)], $locale);
        $lines[] = __('chatbot.cart_footer', [], $locale);
        return implode("\n", $lines);
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
