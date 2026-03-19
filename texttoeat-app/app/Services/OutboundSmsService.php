<?php

namespace App\Services;

use App\Models\OutboundSms;
use App\Models\Setting;
use App\Models\SmsDevice;
use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Contract\Messaging;
use Kreait\Firebase\Factory;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Exception\MessagingException;

class OutboundSmsService
{
    private ?Messaging $messaging = null;

    /**
     * Enqueue one outbound SMS row (full body) and send exactly one FCM data message to the registered device.
     * Payload contract: smsData contains smsId (string), recipients (array), message (full text).
     *
     * @param  int|null  $simSubscriptionId  Optional SIM subscription ID for multi-SIM targeting.
     * @param  int|null  $conversationId  Optional; when set, message is part of a human-intervention segment.
     * @return array{success: bool, ids?: list<int>, message?: string}
     */
    public function enqueueAndSendFcm(
        string $to,
        string $body,
        ?string $channel = null,
        ?int $chatbotSessionId = null,
        ?int $simSubscriptionId = null,
        ?int $conversationId = null
    ): array {
        $body = trim($body);
        if ($body === '') {
            return ['success' => true, 'ids' => []];
        }

        $device = $this->resolveFcmDevice();

        $row = OutboundSms::create([
            'to' => $to,
            'body' => $body,
            'status' => 'pending',
            'channel' => $channel,
            'chatbot_session_id' => $chatbotSessionId,
            'conversation_id' => $conversationId,
            'sms_device_id' => $device !== null && $device->exists ? $device->id : null,
        ]);

        if ($device === null || $device->device_token === null || $device->device_token === '') {
            Log::debug('OutboundSmsService: no FCM token configured or registered, rows left pending');

            return ['success' => true, 'ids' => [$row->id]];
        }

        $token = $device->device_token;
        $effectiveSimId = $simSubscriptionId ?? $device->preferred_sim_subscription_id;
        $result = $this->sendFcmToToken($token, (string) $row->id, $to, $body, $effectiveSimId);

        if ($result['sent']) {
            if ($device->exists) {
                $device->touchLastUsedAt();
            }
            return ['success' => true, 'ids' => [$row->id]];
        }

        if ($result['invalid_token'] ?? false) {
            $this->invalidateToken($token);
        }

        $failureReason = $result['error_message'] ?? 'FCM delivery failed';
        $row->update([
            'status' => 'failed',
            'failure_reason' => $failureReason,
            'error_message' => $failureReason,
        ]);

        return [
            'success' => false,
            'ids' => [$row->id],
            'message' => $failureReason,
        ];
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
     * Send one FCM data message. smsData payload: smsId (string), recipients (array), message (full text).
     *
     * @return array{sent: bool, invalid_token?: bool}
     */
    private function sendFcmToToken(
        string $token,
        string $id,
        string $to,
        string $body,
        ?int $simSubscriptionId = null
    ): array {
        $messaging = $this->getMessaging();
        if ($messaging === null) {
            return ['sent' => false];
        }

        $smsData = [
            'smsId' => $id,
            'recipients' => [$to],
            'message' => $body,
        ];

        $data = [
            'type' => 'smsData',
            'smsData' => json_encode($smsData),
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

            return [
                'sent' => false,
                'invalid_token' => $invalid,
                'error_message' => $e->getMessage(),
            ];
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

        if (app()->bound(Messaging::class)) {
            return app(Messaging::class);
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
