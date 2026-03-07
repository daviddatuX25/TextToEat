<?php

namespace App\Messenger;

use Illuminate\Support\Facades\Http;

class FacebookMessengerClient
{
    private string $pageAccessToken;

    private string $graphBaseUrl;

    private string $graphVersion;

    public function __construct()
    {
        $this->pageAccessToken = (string) config('facebook.page_access_token', '');
        $this->graphBaseUrl = (string) config('facebook.graph_base_url', 'https://graph.facebook.com');
        $this->graphVersion = (string) config('facebook.graph_version', 'v18.0');
    }

    public function sendTextMessage(string $recipientId, string $text): void
    {
        if ($this->pageAccessToken === '') {
            return;
        }

        $this->postMessages([
            'recipient' => ['id' => $recipientId],
            'messaging_type' => 'RESPONSE',
            'message' => ['text' => $text],
        ]);
    }

    /**
     * Send a text message with quick reply buttons (max 13; title max 20 chars).
     *
     * @param array<int, array{title: string, payload: string}> $options
     */
    public function sendQuickReply(string $recipientId, string $text, array $options): void
    {
        if ($this->pageAccessToken === '') {
            return;
        }

        $quickReplies = [];
        foreach (array_slice($options, 0, 13) as $opt) {
            $title = mb_substr($opt['title'] ?? '', 0, 20);
            $payload = $opt['payload'] ?? '';
            if ($title !== '' && $payload !== '') {
                $quickReplies[] = [
                    'content_type' => 'text',
                    'title' => $title,
                    'payload' => $payload,
                ];
            }
        }

        if ($quickReplies === []) {
            $this->sendTextMessage($recipientId, $text);

            return;
        }

        $this->postMessages([
            'recipient' => ['id' => $recipientId],
            'messaging_type' => 'RESPONSE',
            'message' => [
                'text' => $text,
                'quick_replies' => $quickReplies,
            ],
        ]);
    }

    /**
     * Send a button template (up to 3 postback buttons).
     *
     * @param array<int, array{type: string, title: string, payload?: string, url?: string}> $buttons
     */
    public function sendButtonTemplate(string $recipientId, string $text, array $buttons): void
    {
        if ($this->pageAccessToken === '') {
            return;
        }

        $apiButtons = [];
        foreach (array_slice($buttons, 0, 3) as $btn) {
            $type = $btn['type'] ?? 'postback';
            $title = mb_substr($btn['title'] ?? '', 0, 20);
            if ($title === '') {
                continue;
            }
            if ($type === 'postback') {
                $apiButtons[] = [
                    'type' => 'postback',
                    'title' => $title,
                    'payload' => $btn['payload'] ?? $title,
                ];
            } elseif ($type === 'web_url') {
                $apiButtons[] = [
                    'type' => 'web_url',
                    'title' => $title,
                    'url' => $btn['url'] ?? '',
                ];
            }
        }

        if ($apiButtons === []) {
            $this->sendTextMessage($recipientId, $text);

            return;
        }

        $this->postMessages([
            'recipient' => ['id' => $recipientId],
            'messaging_type' => 'RESPONSE',
            'message' => [
                'attachment' => [
                    'type' => 'template',
                    'payload' => [
                        'template_type' => 'button',
                        'text' => $text,
                        'buttons' => $apiButtons,
                    ],
                ],
            ],
        ]);
    }

    /**
     * Send a generic template (single card).
     *
     * @param array{title: string, subtitle?: string, image_url?: string, buttons?: array} $element
     */
    public function sendGenericTemplate(string $recipientId, array $element): void
    {
        $this->sendCarousel($recipientId, [$element]);
    }

    /**
     * Send a carousel (up to 10 generic template elements).
     *
     * @param array<int, array{title: string, subtitle?: string, image_url?: string, buttons?: array<int, array{type: string, title: string, payload?: string}>}> $elements
     */
    public function sendCarousel(string $recipientId, array $elements): void
    {
        if ($this->pageAccessToken === '') {
            return;
        }

        $apiElements = [];
        foreach (array_slice($elements, 0, 10) as $el) {
            $card = [
                'title' => mb_substr($el['title'] ?? '', 0, 80),
            ];
            if (! empty($el['subtitle'])) {
                $card['subtitle'] = mb_substr($el['subtitle'], 0, 80);
            }
            if (! empty($el['image_url'])) {
                $card['image_url'] = $el['image_url'];
            }
            if (! empty($el['buttons'])) {
                $card['buttons'] = [];
                foreach (array_slice($el['buttons'], 0, 3) as $btn) {
                    $title = mb_substr($btn['title'] ?? '', 0, 20);
                    if ($title !== '') {
                        $card['buttons'][] = [
                            'type' => 'postback',
                            'title' => $title,
                            'payload' => $btn['payload'] ?? $title,
                        ];
                    }
                }
            }
            $apiElements[] = $card;
        }

        if ($apiElements === []) {
            return;
        }

        $this->postMessages([
            'recipient' => ['id' => $recipientId],
            'messaging_type' => 'RESPONSE',
            'message' => [
                'attachment' => [
                    'type' => 'template',
                    'payload' => [
                        'template_type' => 'generic',
                        'elements' => $apiElements,
                    ],
                ],
            ],
        ]);
    }

    /**
     * Send a receipt template for order confirmation.
     *
     * @param array<string, mixed> $receiptPayload See Messenger Receipt Template reference.
     */
    public function sendReceiptTemplate(string $recipientId, array $receiptPayload): void
    {
        if ($this->pageAccessToken === '') {
            return;
        }

        $this->postMessages([
            'recipient' => ['id' => $recipientId],
            'messaging_type' => 'RESPONSE',
            'message' => [
                'attachment' => [
                    'type' => 'template',
                    'payload' => array_merge(['template_type' => 'receipt'], $receiptPayload),
                ],
            ],
        ]);
    }

    /**
     * Set the persistent menu (Graph API messenger_profile).
     *
     * @param array<int, array{type: string, title: string, payload?: string, url?: string, call_to_actions?: array}> $menu
     */
    public function setPersistentMenu(array $menu): void
    {
        if ($this->pageAccessToken === '') {
            return;
        }

        $endpoint = sprintf(
            '%s/%s/me/messenger_profile',
            rtrim($this->graphBaseUrl, '/'),
            trim($this->graphVersion, '/')
        );

        $callToActions = [];
        foreach (array_slice($menu, 0, 5) as $item) {
            $title = mb_substr($item['title'] ?? '', 0, 30);
            if ($title === '') {
                continue;
            }
            if (isset($item['call_to_actions']) && is_array($item['call_to_actions'])) {
                $nested = [];
                foreach (array_slice($item['call_to_actions'], 0, 5) as $n) {
                    $t = mb_substr($n['title'] ?? '', 0, 30);
                    if ($t !== '' && isset($n['payload'])) {
                        $nested[] = ['type' => 'postback', 'title' => $t, 'payload' => $n['payload']];
                    }
                }
                if ($nested !== []) {
                    $callToActions[] = [
                        'type' => 'nested',
                        'title' => $title,
                        'call_to_actions' => $nested,
                    ];
                }
            } else {
                $callToActions[] = [
                    'type' => 'postback',
                    'title' => $title,
                    'payload' => $item['payload'] ?? $item['title'],
                ];
            }
        }

        if ($callToActions === []) {
            return;
        }

        Http::withToken($this->pageAccessToken)
            ->acceptJson()
            ->post($endpoint, [
                'get_started' => [
                    'payload' => 'MAIN_HOME',
                ],
                'persistent_menu' => [
                    [
                        'locale' => 'default',
                        'call_to_actions' => $callToActions,
                    ],
                ],
            ])
            ->throw();
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function postMessages(array $payload): void
    {
        $endpoint = sprintf(
            '%s/%s/me/messages',
            rtrim($this->graphBaseUrl, '/'),
            trim($this->graphVersion, '/')
        );

        Http::withToken($this->pageAccessToken)
            ->acceptJson()
            ->post($endpoint, $payload)
            ->throw();
    }
}
