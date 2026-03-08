<?php

namespace App\Http\Controllers;

use App\Chatbot\ChatbotOrderLookupService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TrackOrderController extends Controller
{
    public function __construct(
        private ChatbotOrderLookupService $orderLookup
    ) {}

    public function show(Request $request): Response
    {
        $reference = $request->query('reference');
        $searchedReference = null;
        $order = null;

        $normalized = $reference !== null && $reference !== '' ? strtoupper(trim((string) $reference)) : '';
        if ($normalized !== '') {
            $searchedReference = $normalized;
            $found = $this->orderLookup->findByReference($normalized);
            if ($found) {
                $found->load(['orderItems.menuItem', 'statusChangeLogs']);
                $order = [
                    'reference' => $found->reference,
                    'status' => $found->status,
                    'delivery_type' => $found->delivery_type ?? 'pickup',
                    'status_copy' => $this->statusCopy($found->status, $found->delivery_type ?? 'pickup'),
                    'created_at' => $found->created_at?->toIso8601String(),
                    'order_items' => $found->orderItems->map(fn ($item) => [
                        'name' => $item->name,
                        'quantity' => $item->quantity,
                        'price' => (float) $item->price,
                        'image_url' => $item->menuItem?->image_url,
                    ])->values()->all(),
                    'status_timeline' => $this->buildStatusTimeline($found),
                ];
            }
        }

        return Inertia::render('Track', [
            'order' => $order,
            'searched_reference' => $searchedReference,
        ]);
    }

    /**
     * @param  \App\Models\Order  $order
     * @return list<array{status: string, at: string}>
     */
    private function buildStatusTimeline($order): array
    {
        $timeline = [
            ['status' => 'received', 'at' => $order->created_at?->toIso8601String() ?? now()->toIso8601String()],
        ];
        $seen = ['received' => true];
        foreach ($order->statusChangeLogs as $log) {
            $toStatus = $log->payload['to_status'] ?? null;
            if ($toStatus !== null && ! isset($seen[$toStatus])) {
                $seen[$toStatus] = true;
                $timeline[] = [
                    'status' => $toStatus,
                    'at' => $log->created_at?->toIso8601String() ?? now()->toIso8601String(),
                ];
            }
        }

        return $timeline;
    }

    private function statusCopy(string $status, string $deliveryType): string
    {
        $isDelivery = $deliveryType === 'delivery';

        return match ($status) {
            'received' => 'Order received. Being prepared.',
            'confirmed' => 'Preparing your order.', // legacy: orders not yet backfilled
            'preparing' => 'Preparing your order.',
            'ready' => $isDelivery ? 'Ready. Will be on the way soon.' : 'Ready for pickup.',
            'on_the_way' => 'On the way to you.',
            'completed' => 'Order complete. Thank you.',
            'cancelled' => 'Order cancelled.',
            default => 'Order received. Being prepared.',
        };
    }
}
