<?php

namespace App\Contracts;

interface MessengerSenderInterface
{
    /**
     * When $conversationId is set, the message is tagged as part of a human-intervention segment.
     */
    public function send(string $recipientId, string $text, ?int $conversationId = null): void;
}
