<?php

namespace App\Services\Channels;

use App\Contracts\MessengerSenderInterface;
use App\Services\FacebookMessengerClient;

class FacebookMessengerSender implements MessengerSenderInterface
{
    public function __construct(
        private FacebookMessengerClient $client
    ) {}

    public function send(string $recipientId, string $text): void
    {
        $this->client->sendTextMessage($recipientId, $text);
    }
}
