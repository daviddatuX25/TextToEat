<?php

namespace App\Services;

use App\Models\OutboundSms;
use App\Models\SmsDevice;
use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Contract\Messaging;
use Kreait\Firebase\Factory;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Exception\MessagingException;

class OutboundSmsService
{
    private const SMS_CHAR_LIMIT = 160;

    private ?Messaging $messaging = null;

    /**
     * Enqueue outbound SMS (one row per 160-char segment) and send FCM data message(s) to the registered device.
     *
     * @return array{success: bool, ids?: list<int>, message?: string}
     */
    public function enqueueAndSendFcm(
        string $to,
        string $body,
        ?string $channel = null,
        ?int $chatbotSessionId = null
    ): array {
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
                'channel' => $channel,
                'chatbot_session_id' => $chatbotSessionId,
            ]);
            $ids[] = $row->id;
        }

        $token = $this->resolveFcmToken();
        if ($token === null || $token === '') {
            Log::debug('OutboundSmsService: no FCM token configured or registered, rows left pending');

            return ['success' => true, 'ids' => $ids];
        }

        $device = SmsDevice::where('device_token', $token)->first();
        $sent = 0;
        foreach ($ids as $i => $id) {
            $row = OutboundSms::find($id);
            if (! $row || $row->status !== 'pending') {
                continue;
            }
            $result = $this->sendFcmToToken($token, (string) $id, $to, $row->body);
            if ($result['sent']) {
                $sent++;
            } else {
                if ($result['invalid_token'] ?? false) {
                    $this->invalidateToken($token);
                    break;
                }
            }
        }

        if ($device && $sent > 0) {
            $device->touchLastUsedAt();
        }

        return ['success' => true, 'ids' => $ids];
    }

    /**
     * Split message into segments of max 160 chars. Prefer splitting on newlines so lines stay intact.
     *
     * @return list<string>
     */
    private function splitMessage(string $message): array
    {
        if ($message === '') {
            return [];
        }
        $segments = [];
        $lines = explode("\n", $message);

        foreach ($lines as $line) {
            $remaining = $line;
            while ($remaining !== '') {
                if (mb_strlen($remaining) <= self::SMS_CHAR_LIMIT) {
                    $segments[] = $remaining;
                    break;
                }
                $segments[] = mb_substr($remaining, 0, self::SMS_CHAR_LIMIT);
                $remaining = mb_substr($remaining, self::SMS_CHAR_LIMIT);
            }
        }

        return $segments;
    }

    private function resolveFcmToken(): ?string
    {
        $device = SmsDevice::orderByDesc('last_used_at')->first();
        if ($device !== null) {
            return $device->device_token;
        }
        $fallback = config('firebase.device_token');

        return $fallback !== null && $fallback !== '' ? $fallback : null;
    }

    /**
     * @return array{sent: bool, invalid_token?: bool}
     */
    private function sendFcmToToken(string $token, string $id, string $to, string $body): array
    {
        $messaging = $this->getMessaging();
        if ($messaging === null) {
            return ['sent' => false];
        }

        try {
            $message = CloudMessage::new()
                ->withData([
                    'id' => $id,
                    'to' => $to,
                    'body' => $body,
                ])
                ->withToken($token);

            $messaging->send($message);

            return ['sent' => true];
        } catch (\Throwable $e) {
            Log::warning('OutboundSmsService FCM send failed', [
                'id' => $id,
                'message' => $e->getMessage(),
            ]);
            $invalid = $e instanceof MessagingException
                || str_contains(strtolower($e->getMessage()), 'unregistered')
                || str_contains(strtolower($e->getMessage()), 'invalid')
                || str_contains(strtolower($e->getMessage()), 'not found');

            return ['sent' => false, 'invalid_token' => $invalid];
        }
    }

    private function invalidateToken(string $token): void
    {
        SmsDevice::where('device_token', $token)->delete();
        Log::info('OutboundSmsService: invalidated FCM token (removed from sms_devices)');
    }

    private function getMessaging(): ?Messaging
    {
        if ($this->messaging !== null) {
            return $this->messaging;
        }

        $credentialsPath = config('firebase.credentials');
        if ($credentialsPath === null || $credentialsPath === '' || ! is_file($credentialsPath)) {
            Log::debug('OutboundSmsService: FIREBASE_CREDENTIALS not set or file missing');

            return null;
        }

        try {
            $factory = (new Factory)->withServiceAccount($credentialsPath);
            $this->messaging = $factory->createMessaging();

            return $this->messaging;
        } catch (\Throwable $e) {
            Log::warning('OutboundSmsService: failed to create Firebase Messaging', ['message' => $e->getMessage()]);

            return null;
        }
    }
}
