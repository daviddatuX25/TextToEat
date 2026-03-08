<?php

namespace App\Services\Channels;

use App\Contracts\MessengerSenderInterface;
use App\Messenger\FacebookMessengerClient;
use App\Models\OutboundMessenger;
use App\Models\Setting;

class FacebookMessengerSender implements MessengerSenderInterface
{
    public function __construct(
        private FacebookMessengerClient $client
    ) {}

    public function send(string $recipientId, string $text): void
    {
        if (! Setting::get('channels.messenger_enabled', true)) {
            return;
        }

        $this->client->sendTextMessage($recipientId, $text);

        OutboundMessenger::create([
            'to' => $recipientId,
            'body' => $text,
        ]);
    }
}
