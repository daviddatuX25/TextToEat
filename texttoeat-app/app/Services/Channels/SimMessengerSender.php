<?php

namespace App\Services\Channels;

use App\Contracts\MessengerSenderInterface;
use App\Models\OutboundMessenger;

class SimMessengerSender implements MessengerSenderInterface
{
    public function send(string $recipientId, string $text, ?int $conversationId = null): void
    {
        OutboundMessenger::create([
            'to' => $recipientId,
            'body' => $text,
            'conversation_id' => $conversationId,
        ]);
    }
}
