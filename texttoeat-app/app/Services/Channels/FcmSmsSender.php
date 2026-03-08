<?php

namespace App\Services\Channels;

use App\Contracts\SmsSenderInterface;
use App\Models\Setting;
use App\Services\OutboundSmsService;

class FcmSmsSender implements SmsSenderInterface
{
    public function __construct(
        private OutboundSmsService $outboundSmsService
    ) {}

    /**
     * @return array{success: bool, ids?: list<int>, message?: string}
     */
    public function send(string $to, string $body, ?string $channel = null, ?int $chatbotSessionId = null): array
    {
        if (! Setting::get('channels.sms_enabled', true)) {
            return ['success' => false, 'message' => 'SMS channel is disabled'];
        }

        return $this->outboundSmsService->enqueueAndSendFcm($to, $body, $channel, $chatbotSessionId);
    }
}
