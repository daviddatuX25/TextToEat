<?php

namespace App\Services\Channels;

use App\Contracts\SmsSenderInterface;
use App\Models\OutboundSms;

class SimSmsSender implements SmsSenderInterface
{
    private const SMS_CHAR_LIMIT = 160;

    /**
     * @return array{success: bool, ids?: list<int>, message?: string}
     */
    public function send(string $to, string $body, ?string $channel = null, ?int $chatbotSessionId = null): array
    {
        $segments = $this->splitMessage($body);
        if ($segments === []) {
            return ['success' => true, 'ids' => []];
        }

        $ids = [];
        foreach ($segments as $segment) {
            $row = OutboundSms::create([
                'to' => $to,
                'body' => $segment,
                'status' => 'pending',
                'channel' => $channel ?? 'sms',
                'chatbot_session_id' => $chatbotSessionId,
            ]);
            $ids[] = $row->id;
        }

        return ['success' => true, 'ids' => $ids];
    }

    /**
     * @return list<string>
     */
    private function splitMessage(string $message): array
    {
        if ($message === '') {
            return [];
        }
        $segments = [];
        $remaining = $message;
        while ($remaining !== '') {
            if (mb_strlen($remaining) <= self::SMS_CHAR_LIMIT) {
                $segments[] = $remaining;
                break;
            }
            $segments[] = mb_substr($remaining, 0, self::SMS_CHAR_LIMIT);
            $remaining = mb_substr($remaining, self::SMS_CHAR_LIMIT);
        }

        return $segments;
    }
}
