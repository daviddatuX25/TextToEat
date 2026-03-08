<?php

namespace App\Http\Controllers;

use App\Models\OutboundSms;
use App\Models\Setting;
use App\Models\SmsDevice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SmsDeviceController extends Controller
{
    /**
     * Register device (initial registration). Accepts RegisterDeviceInputDTO (fcmToken, deviceId, name, brand, model, os, appVersionCode, simInfo).
     * Legacy: also accepts { token, name }. Returns deviceId (from body or generated) so the app can use it for PUT/heartbeat/status.
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'fcmToken' => ['required_without:token', 'nullable', 'string'],
            'token' => ['required_without:fcmToken', 'nullable', 'string'],
            'deviceId' => ['nullable', 'string', 'max:64'],
            'name' => ['nullable', 'string', 'max:255'],
            'brand' => ['nullable', 'string', 'max:255'],
            'model' => ['nullable', 'string', 'max:255'],
            'os' => ['nullable', 'string', 'max:64'],
            'appVersionCode' => ['nullable', 'integer', 'min:0'],
            'simInfo' => ['nullable', 'array'],
            'simInfo.*.carrierName' => ['nullable', 'string'],
            'simInfo.*.displayName' => ['nullable', 'string'],
            'simInfo.*.slotIndex' => ['nullable', 'integer'],
            'simInfo.*.subscriptionId' => ['nullable', 'integer'],
        ]);

        $token = $validated['fcmToken'] ?? $validated['token'];
        $payload = [
            'device_token' => $token,
            'name' => $validated['name'] ?? null,
            'brand' => $validated['brand'] ?? null,
            'model' => $validated['model'] ?? null,
            'os' => $validated['os'] ?? null,
            'app_version_code' => $validated['appVersionCode'] ?? null,
            'sim_info' => $validated['simInfo'] ?? null,
            'enabled' => true,
            'last_used_at' => now(),
        ];

        if (! empty($validated['deviceId'])) {
            $device = SmsDevice::updateOrCreate(
                ['device_id' => $validated['deviceId']],
                array_merge($payload, ['device_id' => $validated['deviceId']])
            );
        } else {
            $deviceId = (string) Str::uuid();
            $device = SmsDevice::updateOrCreate(
                ['device_token' => $token],
                array_merge($payload, ['device_id' => $deviceId])
            );
        }
        $device->touchLastUsedAt();

        return response()->json([
            'registered' => true,
            'deviceId' => $device->device_id,
            '_id' => $device->device_id,
            'name' => $device->name,
            'heartbeatIntervalMinutes' => (int) Setting::get('firebase.heartbeat_interval_minutes', config('firebase.heartbeat_interval_minutes', 15)),
        ]);
    }

    /**
     * Update device (status or FCM token refresh). PUT /api/sms/device/{deviceId}
     */
    public function update(Request $request, string $deviceId): JsonResponse
    {
        $device = SmsDevice::where('device_id', $deviceId)->firstOrFail();

        $validated = $request->validate([
            'fcmToken' => ['nullable', 'string'],
            'name' => ['nullable', 'string', 'max:255'],
            'enabled' => ['nullable', 'boolean'], // request body may send enabled/disabled
            'brand' => ['nullable', 'string', 'max:255'],
            'model' => ['nullable', 'string', 'max:255'],
            'os' => ['nullable', 'string', 'max:64'],
            'appVersionCode' => ['nullable', 'integer', 'min:0'],
            'simInfo' => ['nullable', 'array'],
            'simInfo.*.carrierName' => ['nullable', 'string'],
            'simInfo.*.displayName' => ['nullable', 'string'],
            'simInfo.*.slotIndex' => ['nullable', 'integer'],
            'simInfo.*.subscriptionId' => ['nullable', 'integer'],
        ]);

        $update = [];
        if (array_key_exists('fcmToken', $validated) && $validated['fcmToken'] !== null && $validated['fcmToken'] !== '') {
            $update['device_token'] = $validated['fcmToken'];
        }
        if (array_key_exists('name', $validated)) {
            $update['name'] = $validated['name'];
        }
        if (array_key_exists('enabled', $validated)) {
            $update['enabled'] = $validated['enabled'];
        }
        if (array_key_exists('brand', $validated)) {
            $update['brand'] = $validated['brand'];
        }
        if (array_key_exists('model', $validated)) {
            $update['model'] = $validated['model'];
        }
        if (array_key_exists('os', $validated)) {
            $update['os'] = $validated['os'];
        }
        if (array_key_exists('appVersionCode', $validated)) {
            $update['app_version_code'] = $validated['appVersionCode'];
        }
        if (array_key_exists('simInfo', $validated)) {
            $update['sim_info'] = $validated['simInfo'];
        }
        if ($update !== []) {
            $update['last_used_at'] = now();
            $device->update($update);
        }

        return response()->json([
            'ok' => true,
            '_id' => $device->device_id,
            'name' => $device->name,
            'heartbeatIntervalMinutes' => (int) Setting::get('firebase.heartbeat_interval_minutes', config('firebase.heartbeat_interval_minutes', 15)),
        ]);
    }

    /**
     * Heartbeat: device health (battery, storage, simInfo). Response can include fcmTokenUpdated and name.
     */
    public function heartbeat(Request $request, string $deviceId): JsonResponse
    {
        $device = SmsDevice::where('device_id', $deviceId)->firstOrFail();

        $validated = $request->validate([
            'batteryPercentage' => ['nullable', 'integer', 'min:0', 'max:100'],
            'isCharging' => ['nullable', 'boolean'],
            'networkType' => ['nullable', 'string', 'in:wifi,cellular'],
            'memoryUsage' => ['nullable', 'numeric', 'min:0'],
            'storageUsage' => ['nullable', 'numeric', 'min:0'],
            'simInfo' => ['nullable', 'array'],
            'simInfo.*.carrierName' => ['nullable', 'string'],
            'simInfo.*.displayName' => ['nullable', 'string'],
            'simInfo.*.slotIndex' => ['nullable', 'integer'],
            'simInfo.*.subscriptionId' => ['nullable', 'integer'],
        ]);

        $payload = [
            'batteryPercentage' => $validated['batteryPercentage'] ?? null,
            'isCharging' => $validated['isCharging'] ?? null,
            'networkType' => $validated['networkType'] ?? null,
            'memoryUsage' => $validated['memoryUsage'] ?? null,
            'storageUsage' => $validated['storageUsage'] ?? null,
            'simInfo' => $validated['simInfo'] ?? null,
        ];

        $device->update([
            'last_heartbeat_at' => now(),
            'last_heartbeat_payload' => $payload,
            'last_used_at' => now(),
            'sim_info' => $payload['simInfo'] ?? $device->sim_info,
        ]);

        $response = [
            'fcmTokenUpdated' => false,
            'name' => $device->name,
        ];

        return response()->json($response);
    }

    /**
     * Outbound SMS status webhook: SENT, DELIVERED, FAILED. POST /api/sms/device/{deviceId}/sms/status
     */
    public function smsStatus(Request $request, string $deviceId): JsonResponse
    {
        SmsDevice::where('device_id', $deviceId)->firstOrFail();

        $validated = $request->validate([
            'smsId' => ['required', 'integer', 'exists:outbound_sms,id'],
            'smsBatchId' => ['nullable', 'string', 'max:64'],
            'status' => ['required', 'string', 'in:SENT,DELIVERED,FAILED'],
            'errorCode' => ['nullable', 'string', 'max:64'],
            'errorMessage' => ['nullable', 'string', 'max:1024'],
        ]);

        $this->applySmsStatus(
            (int) $validated['smsId'],
            $validated['status'],
            $validated['errorCode'] ?? null,
            $validated['errorMessage'] ?? null
        );

        return response()->json(['ok' => true]);
    }

    private function applySmsStatus(int $id, string $status, ?string $errorCode, ?string $errorMessage): void
    {
        $row = OutboundSms::find($id);
        if ($row === null || ! in_array($row->status, ['pending', 'sent'], true)) {
            return;
        }

        $normalized = strtolower($status);
        $row->status = $normalized === 'delivered' ? 'delivered' : ($normalized === 'sent' ? 'sent' : 'failed');
        if ($row->status === 'sent') {
            $row->sent_at = $row->sent_at ?? now();
        }
        if ($row->status === 'delivered') {
            $row->delivered_at = now();
        }
        if ($row->status === 'failed') {
            $row->error_code = $errorCode;
            $row->error_message = $errorMessage;
            $row->failure_reason = $errorMessage ?? $errorCode;
        }
        $row->save();
    }

    /**
     * Legacy: single or batch mark-sent (id + status sent/failed). Kept for backward compatibility.
     */
    public function markSent(Request $request): JsonResponse
    {
        $body = $request->all();
        if (isset($body['id'])) {
            $validated = $request->validate([
                'id' => ['required', 'integer', 'exists:outbound_sms,id'],
                'status' => ['required', 'string', 'in:sent,failed'],
                'reason' => ['required_if:status,failed', 'nullable', 'string'],
            ]);
            $this->markOne($validated['id'], $validated['status'], $validated['reason'] ?? null);
        } else {
            $validated = $request->validate([
                'items' => ['required', 'array'],
                'items.*.id' => ['required', 'integer', 'exists:outbound_sms,id'],
                'items.*.status' => ['required', 'string', 'in:sent,failed'],
                'items.*.reason' => ['nullable', 'string'],
            ]);
            foreach ($validated['items'] as $item) {
                if ($item['status'] === 'failed' && empty($item['reason'])) {
                    throw ValidationException::withMessages([
                        'items' => ['Reason is required when status is failed.'],
                    ]);
                }
                $this->markOne($item['id'], $item['status'], $item['reason'] ?? null);
            }
        }

        return response()->json(['ok' => true]);
    }

    private function markOne(int $id, string $status, ?string $reason): void
    {
        $row = OutboundSms::find($id);
        if ($row === null || $row->status !== 'pending') {
            return;
        }

        $row->status = $status;
        if ($status === 'sent') {
            $row->sent_at = now();
        }
        if ($status === 'failed' && $reason !== null) {
            $row->failure_reason = $reason;
        }
        $row->save();
    }
}
