<?php

namespace App\Chatbot;

use App\Models\Order;

class ChatbotOrderLookupService
{
    /**
     * Find orders by external_id and channel (SMS/Messenger).
     * Returns recent non-completed, non-cancelled orders.
     *
     * @return \Illuminate\Support\Collection<int, Order>
     */
    public function findByExternalId(string $externalId, string $channel, int $limit = 5)
    {
        if (! \in_array($channel, ['sms', 'messenger'], true)) {
            return collect();
        }

        return Order::query()
            ->where('external_id', $externalId)
            ->where('channel', $channel)
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();
    }

    /**
     * Find order by reference (case-insensitive).
     */
    public function findByReference(string $reference): ?Order
    {
        $normalized = strtoupper(trim($reference));
        if ($normalized === '') {
            return null;
        }

        return Order::query()
            ->whereRaw('UPPER(reference) = ?', [$normalized])
            ->first();
    }

    /**
     * Map order status to locale key (status_label_*).
     */
    public function statusLabelKey(string $status): string
    {
        return match ($status) {
            'received' => 'status_label_received',
            'confirmed' => 'status_label_confirmed',
            'ready' => 'status_label_ready',
            'on_the_way' => 'status_label_on_the_way',
            'completed' => 'status_label_completed',
            'cancelled' => 'status_label_cancelled',
            default => 'status_label_received',
        };
    }
}
