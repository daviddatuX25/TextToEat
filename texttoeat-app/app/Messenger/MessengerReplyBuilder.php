<?php

namespace App\Messenger;

/**
 * Builds Messenger-specific outbound message descriptors (quick replies, button template)
 * from chatbot FSM state and reply text. Used only for channel=messenger; SMS stays text-only.
 *
 * Returns a list of message descriptors: ['type' => 'text'|'quick_reply'|'button_template', ...].
 * The webhook controller sends these via FacebookMessengerClient.
 */
class MessengerReplyBuilder
{
    /**
     * Build message descriptors for the given FSM transition.
     *
     * @param array<string, mixed> $statePayload
     * @param array<int, array{id: int, name: string, price: float, category?: string}> $menuItems
     * @param array<int, array{id: int, name: string, is_free: bool, fee: float|null}> $deliveryAreas
     * @return list<array{type: string, text?: string, options?: array, buttons?: array}>
     */
    public function build(
        string $currentState,
        string $nextState,
        string $replyText,
        array $statePayload,
        array $menuItems,
        array $deliveryAreas,
        string $locale
    ): array {
        $text = trim($replyText);
        if ($text === '') {
            return [];
        }

        $out = [];

        switch ($nextState) {
            case 'language_selection':
                $out[] = [
                    'type' => 'quick_reply',
                    'text' => $this->messengerPrompt('choose_language', $locale),
                    'options' => [
                        ['title' => $this->shortLabel('English', $locale), 'payload' => MessengerPayloads::LANG_EN],
                        ['title' => $this->shortLabel('Tagalog', $locale), 'payload' => MessengerPayloads::LANG_TL],
                        ['title' => $this->shortLabel('Ilocano', $locale), 'payload' => MessengerPayloads::LANG_ILO],
                    ],
                ];
                break;
            case 'main_menu':
                $out[] = [
                    'type' => 'quick_reply',
                    'text' => $this->messengerPrompt('main_menu', $locale),
                    'options' => [
                        ['title' => $this->shortLabel('Place order', $locale), 'payload' => MessengerPayloads::MAIN_ORDER],
                        ['title' => $this->shortLabel('Track order', $locale), 'payload' => MessengerPayloads::MAIN_TRACK],
                        ['title' => $this->shortLabel('Language', $locale), 'payload' => MessengerPayloads::MAIN_LANGUAGE],
                        ['title' => $this->shortLabel('Talk to staff', $locale), 'payload' => MessengerPayloads::MAIN_SUPPORT],
                    ],
                ];
                break;
            case 'track_choice':
                $out[] = [
                    'type' => 'quick_reply',
                    'text' => $this->messengerPrompt('track_choice', $locale),
                    'options' => [
                        ['title' => $this->shortLabel('List my orders', $locale), 'payload' => MessengerPayloads::TRACK_LIST],
                        ['title' => $this->shortLabel('Enter reference', $locale), 'payload' => MessengerPayloads::TRACK_REF],
                    ],
                ];
                break;
            case 'delivery_choice':
                $options = [
                    ['title' => $this->shortLabel('Pickup', $locale), 'payload' => MessengerPayloads::DELIVERY_PICKUP],
                ];
                $areaIndex = 2;
                foreach (array_slice($deliveryAreas, 0, 10) as $area) {
                    $name = $area['name'] ?? 'Delivery';
                    $options[] = ['title' => mb_substr($name, 0, 20), 'payload' => 'DELIVERY_AREA_' . $areaIndex];
                    $areaIndex++;
                }
                if (count($deliveryAreas) > 0) {
                    $options[] = ['title' => $this->shortLabel('Other area', $locale), 'payload' => 'DELIVERY_AREA_' . $areaIndex];
                } else {
                    $options[] = ['title' => $this->shortLabel('Delivery', $locale), 'payload' => MessengerPayloads::DELIVERY_DELIVERY];
                }
                $out[] = [
                    'type' => 'quick_reply',
                    'text' => $this->messengerPrompt('delivery_choice', $locale),
                    'options' => array_slice($options, 0, 13),
                ];
                break;
            case 'confirm':
                $out[] = [
                    'type' => 'button_template',
                    'text' => $text,
                    'buttons' => [
                        ['type' => 'postback', 'title' => $this->shortLabel('Yes, place order', $locale), 'payload' => MessengerPayloads::CONFIRM_YES],
                        ['type' => 'postback', 'title' => $this->shortLabel('No / Cancel', $locale), 'payload' => MessengerPayloads::CONFIRM_NO],
                    ],
                ];
                break;
            case 'menu':
                if ($menuItems !== []) {
                    $elements = [];
                    foreach (array_slice($menuItems, 0, 10) as $idx => $item) {
                        $oneBased = $idx + 1;
                        $price = number_format((float) ($item['price'] ?? 0), 2);
                        $elements[] = [
                            'title' => mb_substr((string) ($item['name'] ?? ''), 0, 80),
                            'subtitle' => '₱' . $price,
                            'buttons' => [
                                ['title' => $this->shortLabel('Add', $locale), 'payload' => 'MENU_ITEM_' . $oneBased],
                            ],
                        ];
                    }
                    $header = $this->messengerPrompt('menu_header', $locale);
                    $out[] = [
                        'type' => 'carousel',
                        'text' => trim($header),
                        'elements' => $elements,
                    ];
                } else {
                    $out[] = ['type' => 'text', 'text' => $text];
                }
                break;
            default:
                $out[] = ['type' => 'text', 'text' => $text];
                break;
        }

        return $out;
    }

    private function shortLabel(string $label, string $locale): string
    {
        return mb_substr($label, 0, 20);
    }

    /**
     * Get Messenger-specific short prompt (no numeric options). Fallback to English if key missing for locale.
     */
    private function messengerPrompt(string $key, string $locale): string
    {
        $fullKey = 'chatbot.messenger.' . $key;
        $value = __($fullKey, [], $locale);
        if ($value === $fullKey && $locale !== 'en') {
            $value = __('chatbot.messenger.' . $key, [], 'en');
        }

        return trim((string) $value);
    }
}
