<?php

namespace App\Http\Controllers;

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
        ]);
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
