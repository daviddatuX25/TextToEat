<?php

namespace App\Chatbot;

use App\Models\Order;

/**
 * FSM for chatbot: welcome → language_selection → menu → item_selection → confirm → order_placed.
 * States: welcome, language_selection, main_menu, menu, item_selection, collect_name, delivery_choice,
 * confirm, order_placed, human_takeover, track_choice, track_list, track_ref.
 * Uses $menuItems (id, name, price) for numbered menu; $locale for all replies.
 * For track flow and status replies, pass $externalId and $channel (sms/messenger).
 */
class ChatbotFsm
{
    private ChatbotKeywordMatcher $keywordMatcher;

    private ?ChatbotOrderLookupService $orderLookupService = null;

    public function __construct(?ChatbotKeywordMatcher $keywordMatcher = null, ?ChatbotOrderLookupService $orderLookupService = null)
    {
        $this->keywordMatcher = $keywordMatcher ?? new ChatbotKeywordMatcher();
        $this->orderLookupService = $orderLookupService ?? new ChatbotOrderLookupService();
    }

    /**
     * @param array<string, mixed> $statePayload
     * @param array<int, array{id: int, name: string, price: float}> $menuItems
     * @param array<int, array{id: int, name: string, is_free: bool, fee: float|null}> $deliveryAreas
     * @return array{string, string, array<string, mixed>} [next_state, reply, state_payload]
     */
    public function transition(
        string $currentState,
        string $body,
        array $statePayload,
        array $menuItems = [],
        array $deliveryAreas = [],
        string $locale = 'en',
        ?string $externalId = null,
        ?string $channel = null
    ): array {
        $body = trim($body);
        $bodyLower = strtolower($body);

        $result = match ($currentState) {
            'welcome' => $this->fromWelcome($locale),
            'language_selection' => $this->fromLanguageSelection($body, $statePayload, $menuItems, $locale),
            'main_menu' => $this->fromMainMenu($body, $statePayload, $menuItems, $locale, $externalId, $channel),
            'menu' => $this->fromMenu($body, $statePayload, $menuItems, $locale),
            'item_selection' => $this->fromItemSelection($body, $statePayload, $menuItems, $locale, $channel),
            'collect_name' => $this->fromCollectName($body, $statePayload, $menuItems, $locale),
            'delivery_choice' => $this->fromDeliveryChoice($body, $statePayload, $menuItems, $deliveryAreas, $locale),
            'confirm' => $this->fromConfirm($body, $statePayload, $menuItems, $deliveryAreas, $locale),
            'order_placed' => $this->fromOrderPlaced($body, $menuItems, $locale),
            'human_takeover' => $this->fromHumanTakeover($body, $locale),
            'track_choice' => $this->fromTrackChoice($body, $statePayload, $menuItems, $locale, $externalId, $channel),
            'track_list' => $this->fromTrackList($body, $statePayload, $menuItems, $locale),
            'track_ref' => $this->fromTrackRef($body, $statePayload, $menuItems, $locale),
            default => $this->fromWelcome($locale),
        };

        $nextState = $result[0];
        $reply = $this->appendNavigationHint($result[1], $nextState, $locale);

        return [$nextState, $reply, $result[2]];
    }

    private function appendNavigationHint(string $reply, string $nextState, string $locale): string
    {
        if ($nextState !== 'main_menu') {
            return $reply;
        }
        $hint = __('chatbot.back_main_menu_options', [], $locale);
        return $reply . "\n\nRemember: " . $hint;
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
        if ($keyword === 'back') {
            return [
                'language_selection',
                __('chatbot.language_prompt', [], $locale),
                [],
            ];
        }
        if ($keyword !== null) {
            return $this->handleKeywordInState($keyword, $statePayload, $menuItems, $locale, 'language_selection');
        }
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
    private function fromMainMenu(string $body, array $statePayload, array $menuItems, string $locale, ?string $externalId = null, ?string $channel = null): array
    {
        $keyword = $this->keywordMatcher->match($body);
        if ($keyword === 'back') {
            return [
                'main_menu',
                __('chatbot.main_menu_prompt', [], $locale),
                [],
            ];
        }
        if ($keyword === 'status' || preg_match('/^status\s+\S+/i', $body)) {
            $result = $this->resolveStatusReply($body, $statePayload, $locale, $externalId, $channel);
            if ($result !== null) {
                return $result;
            }
        }
        if ($keyword !== null) {
            return $this->handleKeywordInState($keyword, $statePayload, $menuItems, $locale, 'main_menu', $externalId, $channel);
        }
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
                'track_choice',
                __('chatbot.track_choice_prompt', [], $locale),
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
                'track_choice',
                __('chatbot.track_choice_prompt', [], $locale),
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
        if ($body === '4') {
            return [
                'human_takeover',
                __('chatbot.human_takeover_reply', [], $locale),
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
        if ($keyword === 'back') {
            return [
                'main_menu',
                __('chatbot.main_menu_prompt', [], $locale),
                $this->orderFlowResetPayload(),
            ];
        }
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
    private function fromItemSelection(string $body, array $statePayload, array $menuItems, string $locale, ?string $channel = null): array
    {
        $keyword = $this->keywordMatcher->match($body);
        if ($keyword === 'back') {
            $selectedItems = $this->normalizeSelectedItems($statePayload['selected_items'] ?? []);
            $mode = (string) ($statePayload['item_selection_mode'] ?? 'cart_menu');
            // In edit_* modes, back should go to the cart menu; otherwise go back to the main menu.
            if (in_array($mode, ['edit_select', 'edit_action', 'edit_quantity'], true)) {
                $summary = $this->buildCartSummary($selectedItems, $locale);
                return [
                    'item_selection',
                    __('chatbot.cart_menu_prompt', ['summary' => $summary], $locale),
                    [
                        'selected_items' => $selectedItems,
                        'pending_item' => null,
                        'item_selection_mode' => 'cart_menu',
                        'edit_index' => null,
                    ],
                ];
            }

            $menuText = $this->buildMenuText($menuItems, $locale);
            return [
                'menu',
                __('chatbot.menu_header', [], $locale) . $menuText,
                [
                    'selected_items' => $selectedItems,
                    'pending_item' => null,
                    'item_selection_mode' => null,
                    'edit_index' => null,
                ],
            ];
        }
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

        if (($bodyLower === 'done' || $bodyLower === '4') && $mode === 'cart_menu') {
            if (empty($selectedItems)) {
                $menuText = $this->buildMenuText($menuItems, $locale);
                return [
                    'menu',
                    __('chatbot.done_empty', [], $locale) . ' ' . $menuText,
                    [],
                ];
            }
            $savedName = $statePayload['saved_customer_name'] ?? null;
            // Messenger: skip collect_name; use saved name or Anonymous (FB name can be set on session separately).
            if ($channel === 'messenger') {
                $customerName = ($savedName !== null && $savedName !== '') ? $savedName : 'Anonymous';
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
            $prompt = ($savedName !== null && $savedName !== '')
                ? __('chatbot.collect_name_prompt_with_saved', ['name' => $savedName], $locale)
                : __('chatbot.collect_name_prompt', [], $locale);
            return [
                'collect_name',
                $prompt,
                ['selected_items' => $selectedItems],
            ];
        }

        if ($bodyLower === '1' && $mode === 'cart_menu') {
            $menuText = $this->buildMenuText($menuItems, $locale);
            return [
                'menu',
                __('chatbot.menu_header', [], $locale) . $menuText,
                ['item_selection_mode' => 'cart_menu'],
            ];
        }

        if ($bodyLower === '2' && $mode === 'cart_menu') {
            $summary = $this->buildCartSummary($selectedItems, $locale);
            return [
                'item_selection',
                $summary,
                ['item_selection_mode' => 'cart_menu'],
            ];
        }

        if ($bodyLower === '3' && $mode === 'cart_menu') {
            if (empty($selectedItems)) {
                $menuText = $this->buildMenuText($menuItems, $locale);
                return [
                    'menu',
                    __('chatbot.done_empty', [], $locale) . ' ' . $menuText,
                    [],
                ];
            }
            $summary = $this->buildCartSummary($selectedItems, $locale, false);
            return [
                'item_selection',
                __('chatbot.cart_edit_select_prompt', ['summary' => $summary], $locale),
                ['item_selection_mode' => 'edit_select'],
            ];
        }

        if ($mode === 'edit_select') {
            $index = (int) $body;
            if ($index < 1 || $index > count($selectedItems)) {
                $summary = $this->buildCartSummary($selectedItems, $locale, false);
                return [
                    'item_selection',
                    __('chatbot.cart_edit_invalid_index', [], $locale) . "\n\n" . $summary,
                    ['item_selection_mode' => 'edit_select'],
                ];
            }
            $line = $selectedItems[$index - 1];
            return [
                'item_selection',
                __('chatbot.cart_edit_action_prompt', [
                    'name' => $line['name'],
                    'quantity' => $line['quantity'],
                ], $locale),
                [
                    'item_selection_mode' => 'edit_action',
                    'edit_index' => $index - 1,
                ],
            ];
        }

        if ($mode === 'edit_action' && array_key_exists('edit_index', $statePayload)) {
            $editIndex = (int) $statePayload['edit_index'];
            if (! isset($selectedItems[$editIndex])) {
                $summary = $this->buildCartSummary($selectedItems, $locale);
                return [
                    'item_selection',
                    __('chatbot.cart_edit_invalid_index', ['summary' => $summary], $locale),
                    ['item_selection_mode' => 'cart_menu'],
                ];
            }

            $choice = strtolower(trim($body));
            $line = $selectedItems[$editIndex];

            if ($choice === '1') {
                return [
                    'item_selection',
                    __('chatbot.cart_edit_quantity_prompt', [
                        'name' => $line['name'],
                        'quantity' => $line['quantity'],
                    ], $locale),
                    [
                        'item_selection_mode' => 'edit_quantity',
                        'edit_index' => $editIndex,
                    ],
                ];
            }

            if ($choice === '2') {
                array_splice($selectedItems, $editIndex, 1);
                $summary = $this->buildCartSummary($selectedItems, $locale);
                return [
                    'item_selection',
                    __('chatbot.cart_menu_prompt', ['summary' => $summary], $locale),
                    [
                        'selected_items' => $selectedItems,
                        'item_selection_mode' => 'cart_menu',
                        'edit_index' => null,
                    ],
                ];
            }

            if ($choice === '3') {
                $summary = $this->buildCartSummary($selectedItems, $locale);
                return [
                    'item_selection',
                    __('chatbot.cart_menu_prompt', ['summary' => $summary], $locale),
                    [
                        'selected_items' => $selectedItems,
                        'item_selection_mode' => 'cart_menu',
                        'edit_index' => null,
                    ],
                ];
            }

            // Invalid choice while editing an item: show cart invalid option and stay in edit_action.
            $summary = $this->buildCartSummary($selectedItems, $locale);
            return [
                'item_selection',
                __('chatbot.cart_invalid_option', ['summary' => $summary], $locale),
                [
                    'selected_items' => $selectedItems,
                    'item_selection_mode' => 'edit_action',
                    'edit_index' => $editIndex,
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

        if ($keyword === 'back') {
            $selectedItems = $this->normalizeSelectedItems($statePayload['selected_items'] ?? []);
            $summary = $this->buildCartSummary($selectedItems, $locale);
            return [
                'item_selection',
                __('chatbot.cart_menu_prompt', ['summary' => $summary], $locale),
                [
                    'selected_items' => $selectedItems,
                    'pending_item' => null,
                    'item_selection_mode' => 'cart_menu',
                    'edit_index' => null,
                ],
            ];
        }
        if ($keyword !== null) {
            return $this->handleKeywordInState($keyword, $statePayload, $menuItems, $locale, 'collect_name');
        }
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
    private function fromDeliveryChoice(string $body, array $statePayload, array $menuItems, array $deliveryAreas, string $locale): array
    {
        $keyword = $this->keywordMatcher->match($body);
        $prompt = $this->buildDeliveryChoicePrompt($deliveryAreas, $locale);

        $selectedItems = $this->normalizeSelectedItems($statePayload['selected_items'] ?? []);
        $summary = $this->buildCartSummary($selectedItems, $locale);
        $bodyTrim = trim($body);
        if ($keyword === 'back') {
            $savedName = $statePayload['saved_customer_name'] ?? null;
            $customerName = $statePayload['customer_name'] ?? null;
            if (($savedName === null || $savedName === '') && is_string($customerName) && $customerName !== '' && $customerName !== 'Anonymous') {
                $savedName = $customerName;
            }
            $collectPrompt = ($savedName !== null && $savedName !== '')
                ? __('chatbot.collect_name_prompt_with_saved', ['name' => $savedName], $locale)
                : __('chatbot.collect_name_prompt', [], $locale);
            return [
                'collect_name',
                $collectPrompt,
                [
                    'selected_items' => $selectedItems,
                    'saved_customer_name' => $savedName,
                ],
            ];
        }
        if ($keyword !== null) {
            if ($keyword === 'help') {
                return [
                    'delivery_choice',
                    $prompt,
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
            return $this->handleKeywordInState($keyword, $statePayload, $menuItems, $locale, 'delivery_choice');
        }
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
                $this->buildConfirmPrompt($summary, $statePayload, $locale),
                $payload,
            ];
        }
        if ($intent === 'delivery') {
            return [
                'delivery_choice',
                $prompt,
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
                $this->buildConfirmPrompt($summary, $statePayload, $locale),
                $payload,
            ];
        }
        if (empty($deliveryAreas)) {
            if ($bodyTrim === '2') {
                $payload['delivery_type'] = 'delivery';
                $payload['delivery_place'] = 'Municipal Hall';
                $payload['delivery_fee'] = 0;
                return [
                    'confirm',
                    $this->buildConfirmPrompt($summary, $statePayload, $locale),
                    $payload,
                ];
            }
            if ($bodyTrim === '3') {
                $payload['delivery_type'] = 'delivery';
                $payload['delivery_place'] = 'Within Barangay Tagudin';
                $payload['delivery_fee'] = 0;
                return [
                    'confirm',
                    $this->buildConfirmPrompt($summary, $statePayload, $locale),
                    $payload,
                ];
            }
            if ($bodyTrim === '4') {
                $payload['delivery_type'] = 'delivery';
                $payload['delivery_place'] = 'Other (paid on delivery)';
                $payload['delivery_fee'] = null;
                return [
                    'confirm',
                    $this->buildConfirmPrompt($summary, $statePayload, $locale),
                    $payload,
                ];
            }
        } else {
            $idx = (int) $bodyTrim;
            $maxAreaOption = count($deliveryAreas) + 1; // +1 for pickup at 1
            $otherOption = $maxAreaOption + 1;
            if ($idx >= 2 && $idx <= $maxAreaOption) {
                $area = $deliveryAreas[$idx - 2];
                $payload['delivery_type'] = 'delivery';
                $payload['delivery_place'] = (string) ($area['name'] ?? '');
                $isFree = (bool) ($area['is_free'] ?? false);
                $fee = array_key_exists('fee', $area) ? $area['fee'] : null;
                $payload['delivery_fee'] = $isFree ? 0 : ($fee === null ? null : (float) $fee);
                return [
                    'confirm',
                    $this->buildConfirmPrompt($summary, $statePayload, $locale),
                    $payload,
                ];
            }
            if ($idx === $otherOption) {
                $payload['delivery_type'] = 'delivery';
                $payload['delivery_place'] = 'Other (paid on delivery)';
                $payload['delivery_fee'] = null;
                return [
                    'confirm',
                    $this->buildConfirmPrompt($summary, $statePayload, $locale),
                    $payload,
                ];
            }
        }

        return [
            'delivery_choice',
            __('chatbot.delivery_choice_invalid', [], $locale) . ' ' . $prompt,
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
    private function fromConfirm(string $body, array $statePayload, array $menuItems, array $deliveryAreas, string $locale): array
    {
        $keyword = $this->keywordMatcher->match($body);
        if ($keyword === 'back') {
            $selectedItems = $this->normalizeSelectedItems($statePayload['selected_items'] ?? []);
            $prompt = $this->buildDeliveryChoicePrompt($deliveryAreas, $locale);
            return [
                'delivery_choice',
                $prompt,
                [
                    'selected_items' => $selectedItems,
                    'customer_name' => $statePayload['customer_name'] ?? 'Anonymous',
                    'delivery_type' => null,
                    'delivery_place' => null,
                    'delivery_fee' => null,
                ],
            ];
        }
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
        if (trim(strtolower($body)) === 'exit session') {
            return [
                'main_menu',
                __('chatbot.exit_session_ack', [], $locale),
                $this->orderFlowResetPayload(),
            ];
        }

        return [
            'human_takeover',
            '',
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
        string $currentState,
        ?string $externalId = null,
        ?string $channel = null
    ): array {
        if ($keyword === 'main_menu') {
            return [
                'main_menu',
                __('chatbot.main_menu_prompt', [], $locale),
                $this->orderFlowResetPayload(),
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
            return [
                'main_menu',
                __('chatbot.cancel_ok', [], $locale) . ' ' . __('chatbot.main_menu_prompt', [], $locale),
                $this->orderFlowResetPayload(),
            ];
        }
        if ($keyword === 'status') {
            $menuText = in_array($currentState, ['menu', 'item_selection'], true)
                ? ' ' . $this->buildMenuText($menuItems, $locale)
                : '';
            $mainMenuSuffix = $currentState === 'main_menu' ? "\n\n" . __('chatbot.main_menu_prompt', [], $locale) : '';
            return [
                $currentState === 'main_menu' ? 'main_menu' : $currentState,
                __('chatbot.status_none', [], $locale) . $menuText . $mainMenuSuffix,
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
     * Resolve order and build status reply (conditional). Returns null if no order found.
     *
     * @return array{string, string, array<string, mixed>}|null [next_state, reply, state_payload]
     */
    private function resolveStatusReply(string $body, array $statePayload, string $locale, ?string $externalId, ?string $channel): ?array
    {
        $reference = $this->extractReferenceFromStatusBody($body);
        $order = null;

        if ($reference !== null && $reference !== '') {
            $order = $this->orderLookupService->findByReference($reference);
        } elseif ($externalId !== null && $channel !== null) {
            $lastRef = $statePayload['last_order_reference'] ?? null;
            if ($lastRef !== null && $lastRef !== '') {
                $order = $this->orderLookupService->findByReference($lastRef);
            }
            if ($order === null) {
                $orders = $this->orderLookupService->findByExternalId($externalId, $channel, 1);
                $order = $orders->first();
            }
        }

        if ($order === null) {
            return null;
        }

        return [
            'main_menu',
            $this->buildStatusReply($order, $locale) . "\n\n" . __('chatbot.main_menu_prompt', [], $locale),
            [],
        ];
    }

    /**
     * Extract reference from body like "status ABC123" or "status".
     */
    private function extractReferenceFromStatusBody(string $body): ?string
    {
        $body = trim($body);
        $lower = strtolower($body);
        if (str_starts_with($lower, 'status')) {
            $rest = trim(substr($body, 6));
            return $rest !== '' ? $rest : null;
        }
        return null;
    }

    /**
     * Build status reply. Always shows actual order status (no gating).
     */
    private function buildStatusReply(Order $order, string $locale): string
    {
        $statusKey = $this->orderLookupService->statusLabelKey($order->status);
        $statusLabel = __('chatbot.' . $statusKey, [], $locale);
        $deliveryType = $order->delivery_type ?? 'pickup';
        $pickupSlot = trim((string) ($order->pickup_slot ?? ''));

        if ($deliveryType === 'pickup' && $order->status === 'ready' && $pickupSlot !== '') {
            return __('chatbot.status_ready_pickup_slot', [
                'reference' => $order->reference,
                'slot' => $pickupSlot,
            ], $locale);
        }

        return __('chatbot.status_order', [
            'reference' => $order->reference,
            'status' => $statusLabel,
        ], $locale);
    }

    /**
     * @param array<string, mixed> $statePayload
     * @param array<int, array{id: int, name: string, price: float}> $menuItems
     * @return array{string, string, array<string, mixed>}
     */
    private function fromTrackChoice(string $body, array $statePayload, array $menuItems, string $locale, ?string $externalId, ?string $channel): array
    {
        $keyword = $this->keywordMatcher->match($body);
        if ($keyword === 'back') {
            return [
                'main_menu',
                __('chatbot.main_menu_prompt', [], $locale),
                [],
            ];
        }

        if ($body === '1') {
            if ($externalId === null || $channel === null || ! \in_array($channel, ['sms', 'messenger'], true)) {
                return [
                    'main_menu',
                    __('chatbot.track_list_empty', [], $locale) . "\n\n" . __('chatbot.main_menu_prompt', [], $locale),
                    [],
                ];
            }
            $orders = $this->orderLookupService->findByExternalId($externalId, $channel, 10);
            if ($orders->isEmpty()) {
                return [
                    'main_menu',
                    __('chatbot.track_list_empty', [], $locale) . "\n\n" . __('chatbot.main_menu_prompt', [], $locale),
                    [],
                ];
            }
            $lines = [__('chatbot.track_list_header', [], $locale)];
            foreach ($orders as $i => $o) {
                $num = $i + 1;
                $lines[] = "{$num}. {$o->reference}";
            }
            $lines[] = __('chatbot.track_list_reply', [], $locale);
            $refs = $orders->pluck('reference')->values()->all();

            return [
                'track_list',
                implode("\n", $lines),
                ['track_order_references' => $refs],
            ];
        }

        if ($body === '2') {
            return [
                'track_ref',
                __('chatbot.track_enter_ref', [], $locale),
                [],
            ];
        }

        return [
            'track_choice',
            __('chatbot.track_choice_prompt', [], $locale),
            [],
        ];
    }

    /**
     * @param array<string, mixed> $statePayload
     * @param array<int, array{id: int, name: string, price: float}> $menuItems
     * @return array{string, string, array<string, mixed>}
     */
    private function fromTrackList(string $body, array $statePayload, array $menuItems, string $locale): array
    {
        $keyword = $this->keywordMatcher->match($body);
        if ($keyword === 'back') {
            return [
                'track_choice',
                __('chatbot.track_choice_prompt', [], $locale),
                [],
            ];
        }

        $refs = $statePayload['track_order_references'] ?? [];
        if (! \is_array($refs)) {
            $refs = [];
        }
        $idx = (int) $body;
        if ($idx < 1 || $idx > count($refs)) {
            return [
                'main_menu',
                __('chatbot.main_menu_invalid', [], $locale) . ' ' . __('chatbot.main_menu_prompt', [], $locale),
                [],
            ];
        }
        $reference = $refs[$idx - 1] ?? null;
        if ($reference === null) {
            return [
                'main_menu',
                __('chatbot.status_not_found', [], $locale) . "\n\n" . __('chatbot.main_menu_prompt', [], $locale),
                [],
            ];
        }
        $order = $this->orderLookupService->findByReference($reference);
        if ($order === null) {
            return [
                'main_menu',
                __('chatbot.status_not_found', [], $locale) . "\n\n" . __('chatbot.main_menu_prompt', [], $locale),
                [],
            ];
        }
        $reply = $this->buildStatusReply($order, $locale);

        return [
            'main_menu',
            $reply . "\n\n" . __('chatbot.main_menu_prompt', [], $locale),
            [],
        ];
    }

    /**
     * @param array<string, mixed> $statePayload
     * @param array<int, array{id: int, name: string, price: float}> $menuItems
     * @return array{string, string, array<string, mixed>}
     */
    private function fromTrackRef(string $body, array $statePayload, array $menuItems, string $locale): array
    {
        $keyword = $this->keywordMatcher->match($body);
        if ($keyword === 'back') {
            return [
                'track_choice',
                __('chatbot.track_choice_prompt', [], $locale),
                [],
            ];
        }

        $reference = trim($body);
        if ($reference === '') {
            return [
                'track_ref',
                __('chatbot.track_enter_ref', [], $locale),
                [],
            ];
        }
        $order = $this->orderLookupService->findByReference($reference);
        if ($order === null) {
            return [
                'main_menu',
                __('chatbot.status_not_found', [], $locale) . "\n\n" . __('chatbot.main_menu_prompt', [], $locale),
                [],
            ];
        }
        $reply = $this->buildStatusReply($order, $locale);

        return [
            'main_menu',
            $reply . "\n\n" . __('chatbot.main_menu_prompt', [], $locale),
            [],
        ];
    }

    /**
     * Reset keys related to an in-progress order flow.
     *
     * @return array<string, mixed>
     */
    private function orderFlowResetPayload(): array
    {
        return [
            'selected_items' => [],
            'pending_item' => null,
            'item_selection_mode' => null,
            'edit_index' => null,
            'customer_name' => null,
            'delivery_type' => null,
            'delivery_place' => null,
            'delivery_fee' => null,
        ];
    }

    /**
     * @param array<int, array{id: int, name: string, is_free: bool, fee: float|null}> $deliveryAreas
     */
    private function buildDeliveryChoicePrompt(array $deliveryAreas, string $locale): string
    {
        if (empty($deliveryAreas)) {
            return __('chatbot.delivery_choice_prompt', [], $locale);
        }

        $lines = [__('chatbot.delivery_choice_header', [], $locale)];
        $lines[] = '1. ' . __('chatbot.delivery_summary_pickup', [], $locale);

        foreach ($deliveryAreas as $idx => $area) {
            $num = $idx + 2;
            $name = (string) ($area['name'] ?? '');
            $isFree = (bool) ($area['is_free'] ?? false);
            $fee = array_key_exists('fee', $area) ? $area['fee'] : null;

            if ($isFree) {
                $lines[] = "{$num}. " . __('chatbot.delivery_summary_free', ['place' => $name], $locale);
            } elseif ($fee === null) {
                $lines[] = "{$num}. " . __('chatbot.delivery_summary_fee_on_delivery', ['place' => $name], $locale);
            } else {
                $lines[] = "{$num}. " . __('chatbot.delivery_summary_fee', ['place' => $name, 'fee' => number_format((float) $fee, 2)], $locale);
            }
        }

        $otherNum = count($deliveryAreas) + 2;
        $lines[] = "{$otherNum}. " . __('chatbot.delivery_summary_paid', [], $locale);

        return implode("\n", $lines);
    }

    /**
     * @param array<int, array{id: int, name: string, price: float}> $menuItems
     */
    public function buildMenuTextPublic(array $menuItems, string $locale): string
    {
        return $this->buildMenuText($menuItems, $locale);
    }

    /**
     * @param array<int, array{id: int, name: string, price: float, category?: string}> $menuItems
     */
    private function buildMenuText(array $menuItems, string $locale): string
    {
        if (empty($menuItems)) {
            return __('chatbot.no_menu_today', [], $locale);
        }
        $lines = [];
        $lastCategory = '';
        foreach ($menuItems as $n => $item) {
            $category = $item['category'] ?? '';
            if ($category !== '' && $category !== $lastCategory) {
                $lines[] = '— ' . $category . ' —';
                $lastCategory = $category;
            }
            $num = $n + 1;
            $price = number_format((float) $item['price'], 2);
            $lines[] = "{$num}. {$item['name']} - {$price}";
        }
        $lines[] = __('chatbot.menu_footer', [], $locale);

        return implode("\n", $lines);
    }

    /**
     * @param array<string, mixed> $statePayload
     */
    private function buildConfirmPrompt(string $summary, array $statePayload, string $locale): string
    {
        $base = __('chatbot.confirm_prompt', ['summary' => $summary], $locale);
        $virtualAvailable = $statePayload['virtual_available'] ?? [];
        $selectedItems = $this->normalizeSelectedItems($statePayload['selected_items'] ?? []);
        foreach ($selectedItems as $line) {
            $id = (int) $line['menu_item_id'];
            $qty = (int) $line['quantity'];
            $available = (int) ($virtualAvailable[$id] ?? 0);
            if ($qty > $available) {
                return $base . "\n\n" . __('chatbot.confirm_slots_full_warning', [], $locale);
            }
        }
        return $base;
    }

    /**
     * @param list<array{menu_item_id: int, name: string, price: float, quantity: int}> $selectedItems
     * @param bool $includeFooter whether to append cart_footer (1=Add, 2=View cart, etc.)
     */
    private function buildCartSummary(array $selectedItems, string $locale, bool $includeFooter = true): string
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
        if ($includeFooter) {
            $lines[] = __('chatbot.cart_footer', [], $locale);
        }
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
