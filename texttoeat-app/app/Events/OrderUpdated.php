<?php

namespace App\Events;

use App\Models\Order;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Order $order,
        public bool $statusChanged = false,
        public bool $paymentStatusChanged = false,
    ) {
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('portal.orders')];
    }

    public function broadcastAs(): string
    {
        return 'order.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'order_id' => $this->order->id,
            'reference' => $this->order->reference,
            'status' => $this->order->status,
            'delivery_type' => $this->order->delivery_type ?? 'pickup',
            'channel' => $this->order->channel ?? '',
            'status_changed' => $this->statusChanged,
            'payment_status_changed' => $this->paymentStatusChanged,
            'payment_status' => $this->order->payment_status ?? 'unpaid',
        ];
    }
}
