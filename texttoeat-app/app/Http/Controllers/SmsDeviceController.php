<?php

namespace App\Http\Controllers;

use App\Models\OutboundSms;
use App\Models\SmsDevice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SmsDeviceController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
            'name' => ['nullable', 'string', 'max:255'],
        ]);

        $device = SmsDevice::updateOrCreate(
            ['device_token' => $validated['token']],
            [
                'name' => $validated['name'] ?? null,
                'last_used_at' => now(),
            ]
        );
        $device->touchLastUsedAt();

        return response()->json(['registered' => true]);
    }

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
                    abort(422, 'Reason is required when status is failed.');
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
