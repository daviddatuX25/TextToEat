<?php

namespace App\Services\Channels;

use App\Contracts\MessengerSenderInterface;
use App\Messenger\FacebookMessengerClient;
use App\Models\OutboundMessenger;

class FacebookMessengerSender implements MessengerSenderInterface
{
    public function __construct(
        private FacebookMessengerClient $client
    ) {}

    public function send(string $recipientId, string $text): void
    {
        $this->client->sendTextMessage($recipientId, $text);

        OutboundMessenger::create([
            'to' => $recipientId,
            'body' => $text,
        ]);
    }
}
