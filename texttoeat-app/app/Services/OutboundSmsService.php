<?php

namespace App\Services;

use App\Models\OutboundSms;
use App\Models\Setting;
use App\Models\SmsDevice;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
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
     * @param  int|null  $simSubscriptionId  Optional SIM subscription ID for multi-SIM targeting.
     * @return array{success: bool, ids?: list<int>, message?: string}
     */
    public function enqueueAndSendFcm(
        string $to,
        string $body,
        ?string $channel = null,
        ?int $chatbotSessionId = null,
        ?int $simSubscriptionId = null
    ): array {
        $segments = $this->splitMessage($body);
        if ($segments === []) {
            return ['success' => true, 'ids' => []];
        }

        $batchId = (string) Str::uuid();
        $ids = [];
        foreach ($segments as $segment) {
            $row = OutboundSms::create([
                'to' => $to,
                'body' => $segment,
                'status' => 'pending',
                'channel' => $channel,
                'chatbot_session_id' => $chatbotSessionId,
                'sms_batch_id' => $batchId,
            ]);
            $ids[] = $row->id;
        }

        $device = $this->resolveFcmDevice();
        if ($device === null || $device->device_token === null || $device->device_token === '') {
            Log::debug('OutboundSmsService: no FCM token configured or registered, rows left pending');

            return ['success' => true, 'ids' => $ids];
        }

        $token = $device->device_token;
        $effectiveSimId = $simSubscriptionId ?? $device->preferred_sim_subscription_id;
        $sent = 0;
        foreach ($ids as $i => $id) {
            $row = OutboundSms::find($id);
            if (! $row || $row->status !== 'pending') {
                continue;
            }
            $result = $this->sendFcmToToken($token, (string) $id, $to, $row->body, $batchId, $effectiveSimId);
            if ($result['sent']) {
                $sent++;
            } else {
                if ($result['invalid_token'] ?? false) {
                    $this->invalidateToken($token);
                    break;
                }
            }
        }

        if ($device && $sent > 0 && $device->exists) {
            $device->touchLastUsedAt();
        }

        return ['success' => true, 'ids' => $ids];
    }

    /**
     * Send FCM data message of type "heartbeat_check" so the app triggers a heartbeat request.
     * Target device by device_id or use first enabled device.
     */
    public function sendHeartbeatCheck(?string $deviceId = null): bool
    {
        $device = $deviceId !== null
            ? SmsDevice::where('device_id', $deviceId)->where('enabled', true)->first()
            : SmsDevice::where('enabled', true)->orderByDesc('last_used_at')->first();

        if ($device === null || $device->device_token === null || $device->device_token === '') {
            return false;
        }

        $messaging = $this->getMessaging();
        if ($messaging === null) {
            return false;
        }

        try {
            $message = CloudMessage::new()
                ->withData(['type' => 'heartbeat_check'])
                ->toToken($device->device_token);
            $messaging->send($message);

            return true;
        } catch (\Throwable $e) {
            Log::warning('OutboundSmsService: heartbeat_check FCM failed', ['message' => $e->getMessage()]);

            return false;
        }
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

    /**
     * Resolve the enabled device to use for FCM (most recently used). Returns null if none.
     */
    private function resolveFcmDevice(): ?SmsDevice
    {
        $device = SmsDevice::where('enabled', true)->orderByDesc('last_used_at')->first();
        if ($device !== null) {
            return $device;
        }
        $fallbackToken = Setting::get('firebase.device_token');
        $fallbackToken = is_string($fallbackToken) ? $fallbackToken : config('firebase.device_token');
        if ($fallbackToken !== null && $fallbackToken !== '') {
            $legacy = SmsDevice::where('device_token', $fallbackToken)->first();
            if ($legacy !== null) {
                return $legacy;
            }
            $legacy = new SmsDevice;
            $legacy->device_token = $fallbackToken;
            $legacy->enabled = true;

            return $legacy;
        }

        return null;
    }

    /**
     * @return array{sent: bool, invalid_token?: bool}
     */
    private function sendFcmToToken(
        string $token,
        string $id,
        string $to,
        string $body,
        ?string $batchId = null,
        ?int $simSubscriptionId = null
    ): array {
        $messaging = $this->getMessaging();
        if ($messaging === null) {
            return ['sent' => false];
        }

        $smsData = [
            'recipients' => [$to],
            'message' => $body,
            'smsId' => (int) $id,
            'smsBatchId' => $batchId ?? '',
        ];

        $data = [
            'type' => 'smsData',
            'smsData' => json_encode($smsData),
            'id' => $id,
            'to' => $to,
            'body' => $body,
        ];
        if ($simSubscriptionId !== null) {
            $data['simSubscriptionId'] = (string) $simSubscriptionId;
        }

        try {
            $message = CloudMessage::new()
                ->withData($data)
                ->toToken($token);

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

        $credentialsPath = Setting::get('firebase.credentials_path');
        $credentialsPath = is_string($credentialsPath) ? $credentialsPath : config('firebase.credentials');
        if ($credentialsPath === null || $credentialsPath === '') {
            Log::warning('OutboundSmsService: FIREBASE_CREDENTIALS / firebase.credentials_path not set');

            return null;
        }

        $isAbsolute = str_starts_with($credentialsPath, '/')
            || preg_match('#^[A-Za-z]:[/\\\]#', $credentialsPath);
        $resolved = $isAbsolute
            ? $credentialsPath
            : base_path(ltrim($credentialsPath, './'));

        if (! is_file($resolved)) {
            Log::warning('OutboundSmsService: FIREBASE_CREDENTIALS file missing', [
                'path' => $resolved,
                'raw' => $credentialsPath,
                'base_path' => base_path(),
            ]);

            return null;
        }

        try {
            $factory = (new Factory)->withServiceAccount($resolved);
            $this->messaging = $factory->createMessaging();

            return $this->messaging;
        } catch (\Throwable $e) {
            Log::warning('OutboundSmsService: failed to create Firebase Messaging', [
                'message' => $e->getMessage(),
                'path' => $resolved,
            ]);

            return null;
        }
    }
}
