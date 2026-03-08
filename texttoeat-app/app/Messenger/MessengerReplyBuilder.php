<?php

namespace App\Messenger;

use App\Services\ChatbotReplyResolver;
use App\Services\ChatbotSmsNumberLayer;

/**
 * Builds Messenger-specific outbound message descriptors (quick replies, button template)
 * from chatbot FSM state and reply text. Used only for channel=messenger; SMS stays text-only.
 *
 * Returns a list of message descriptors: ['type' => 'text'|'quick_reply'|'button_template', ...].
 * The webhook controller sends these via FacebookMessengerClient.
 */
class MessengerReplyBuilder
{
    public function __construct(
        private ChatbotReplyResolver $replyResolver,
        private ChatbotSmsNumberLayer $smsNumberLayer
    ) {}

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
                    'text' => trim((string) $this->replyResolver->get('language_prompt', $locale)),
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
                    'text' => trim((string) $this->replyResolver->get('main_menu_prompt', $locale)),
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
                    'text' => trim((string) $this->replyResolver->get('track_choice_prompt', $locale)),
                    'options' => [
                        ['title' => $this->shortLabel('List my orders', $locale), 'payload' => MessengerPayloads::TRACK_LIST],
                        ['title' => $this->shortLabel('Enter reference', $locale), 'payload' => MessengerPayloads::TRACK_REF],
                    ],
                ];
                break;
            case 'delivery_choice':
                $options = [
                    ['title' => $this->shortLabel('Pickup', $locale), 'payload' => MessengerPayloads::DELIVERY_PICKUP],
                    ['title' => $this->shortLabel('Delivery', $locale), 'payload' => MessengerPayloads::DELIVERY_DELIVERY],
                ];
                $out[] = [
                    'type' => 'quick_reply',
                    'text' => $this->smsNumberLayer->formatDeliveryTypeChoiceReply($locale),
                    'options' => $options,
                ];
                break;
            case 'delivery_area_choice':
                $areaText = $this->smsNumberLayer->formatDeliveryAreaChoiceReply($deliveryAreas, $locale);
                $out[] = [
                    'type' => 'text',
                    'text' => $areaText,
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
                        $price = number_format((float) ($item['price'] ?? 0), 2, '.', ',');
                        $elements[] = [
                            'title' => mb_substr((string) ($item['name'] ?? ''), 0, 80),
                            'subtitle' => '₱' . $price,
                            'buttons' => [
                                ['title' => $this->shortLabel('Add', $locale), 'payload' => 'MENU_ITEM_' . $oneBased],
                            ],
                        ];
                    }
                    $out[] = [
                        'type' => 'carousel',
                        'text' => $text,
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
}
