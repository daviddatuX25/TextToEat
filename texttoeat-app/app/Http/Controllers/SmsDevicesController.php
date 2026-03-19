<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use App\Models\OutboundSms;
use App\Models\SmsDevice;
use App\Models\SmsGatewaySetting;
use App\Services\OutboundSmsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SmsDevicesController extends Controller
{
    public function __construct(
        private OutboundSmsService $outboundSmsService
    ) {}

    /**
     * List SMS gateway devices for the portal dashboard.
     */
    public function index(): Response
    {
        $devices = SmsDevice::query()
            ->whereNotNull('device_id')
            ->orderByDesc('last_used_at')
            ->get()
            ->map(fn (SmsDevice $d) => [
                'id' => $d->id,
                'device_id' => $d->device_id,
                'name' => $d->name,
                'brand' => $d->brand,
                'model' => $d->model,
                'os' => $d->os,
                'app_version_code' => $d->app_version_code,
                'enabled' => (bool) $d->enabled,
                'sim_info' => $d->sim_info,
                'preferred_sim_subscription_id' => $d->preferred_sim_subscription_id,
                'last_used_at' => $d->last_used_at?->toIso8601String(),
                'last_heartbeat_at' => $d->last_heartbeat_at?->toIso8601String(),
                'last_heartbeat_payload' => $d->last_heartbeat_payload,
            ]);

        $apiKey = SmsGatewaySetting::getApiKey();

        return Inertia::render('SmsDevices', [
            'devices' => $devices,
            'api_key_for_qr' => $apiKey !== null && $apiKey !== '' ? $apiKey : null,
            'gateway_credentials_configured' => [
                'textbee_api_url' => Setting::has('textbee.api_url'),
                'textbee_webhook_secret' => Setting::has('textbee.webhook_secret'),
                'firebase_credentials_path' => Setting::has('firebase.credentials_path'),
                'firebase_device_token' => Setting::has('firebase.device_token'),
            ],
        ]);
    }

    public function logs(string $deviceId): Response
    {
        $device = SmsDevice::where('device_id', $deviceId)->firstOrFail();

        $logs = OutboundSms::query()
            ->where('sms_device_id', $device->id)
            ->orderByDesc('id')
            ->paginate(50)
            ->through(function (OutboundSms $row) {
                return [
                    'id' => $row->id,
                    'to' => $row->to,
                    'body' => $row->body,
                    'status' => $row->status,
                    'sent_at' => $row->sent_at?->toIso8601String(),
                    'delivered_at' => $row->delivered_at?->toIso8601String(),
                    'failure_reason' => $row->failure_reason,
                    'error_code' => $row->error_code,
                    'error_message' => $row->error_message,
                    'channel' => $row->channel,
                    'chatbot_session_id' => $row->chatbot_session_id,
                    'chatbot_log_url' => $row->chatbot_session_id !== null
                        ? route('portal.logs.chatbot.show', ['session' => $row->chatbot_session_id])
                        : null,
                    'created_at' => $row->created_at?->toIso8601String(),
                ];
            });

        return Inertia::render('SmsDeviceLogs', [
            'device' => [
                'id' => $device->id,
                'device_id' => $device->device_id,
                'name' => $device->name,
                'brand' => $device->brand,
                'model' => $device->model,
                'os' => $device->os,
                'app_version_code' => $device->app_version_code,
                'enabled' => (bool) $device->enabled,
                'last_used_at' => $device->last_used_at?->toIso8601String(),
                'last_heartbeat_at' => $device->last_heartbeat_at?->toIso8601String(),
            ],
            'logs' => $logs,
        ]);
    }

    /**
     * Update SMS/gateway credentials (Textbee, Firebase path, FCM token). Encrypted where applicable. Audit logged.
     */
    public function updateCredentials(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'textbee_api_url' => ['nullable', 'string', 'max:500'],
            'textbee_webhook_secret' => ['nullable', 'string', 'max:255'],
            'firebase_credentials_path' => ['nullable', 'string', 'max:500'],
            'firebase_device_token' => ['nullable', 'string', 'max:500'],
        ]);

        $userId = $request->user()?->id;
        $keyMap = [
            'textbee_api_url' => 'textbee.api_url',
            'textbee_webhook_secret' => 'textbee.webhook_secret',
            'firebase_credentials_path' => 'firebase.credentials_path',
            'firebase_device_token' => 'firebase.device_token',
        ];
        foreach ($validated as $inputKey => $value) {
            $value = trim((string) $value);
            if ($value !== '') {
                Setting::set($keyMap[$inputKey], $value, $userId);
            }
        }

        return redirect()->route('portal.sms-devices')
            ->with('success', 'SMS gateway credentials updated.');
    }

    /**
     * Trigger FCM heartbeat_check so the app reports status. Returns JSON for fetch.
     */
    public function heartbeat(string $deviceId): JsonResponse
    {
        $device = SmsDevice::where('device_id', $deviceId)->firstOrFail();
        $sent = $this->outboundSmsService->sendHeartbeatCheck($deviceId);

        return response()->json([
            'ok' => true,
            'sent' => $sent,
            'message' => $sent
                ? 'Heartbeat request sent. The app will report status shortly.'
                : 'Could not send (FCM not configured or device has no token).',
        ]);
    }

    /**
     * Update device name, enabled state, or preferred SIM (portal).
     */
    public function update(Request $request, string $deviceId): RedirectResponse
    {
        $device = SmsDevice::where('device_id', $deviceId)->firstOrFail();

        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'enabled' => ['nullable', 'boolean'],
            'preferred_sim_subscription_id' => ['nullable', 'integer'],
        ]);

        $updates = [];
        if (array_key_exists('name', $validated)) {
            $updates['name'] = $validated['name'];
        }
        if (array_key_exists('enabled', $validated)) {
            $updates['enabled'] = $validated['enabled'];
        }
        if (array_key_exists('preferred_sim_subscription_id', $validated)) {
            $updates['preferred_sim_subscription_id'] = $validated['preferred_sim_subscription_id'];
        }

        if ($updates !== []) {
            $device->update($updates);
        }

        return redirect()->route('portal.sms-devices')->with('success', 'Device updated.');
    }
}
