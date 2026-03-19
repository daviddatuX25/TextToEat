<?php

namespace App\Contracts;

interface SmsSenderInterface
{
    /**
     * Send SMS to recipient. In prod creates outbound_sms + FCM; in sim creates outbound_sms only.
     * When $conversationId is set, the message is tagged as part of a human-intervention segment.
     *
     * @return array{success: bool, ids?: list<int>, message?: string}
     */
    public function send(string $to, string $body, ?string $channel = null, ?int $chatbotSessionId = null, ?int $conversationId = null): array;
}
