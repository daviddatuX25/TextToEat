<?php

namespace App\Chatbot;

use App\Enums\OrderChannel;
use App\Enums\OrderStatus;
use App\Events\OrderUpdated;
use App\Enums\PaymentStatus;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ChatbotOrderService
{
    /**
     * Create order from session state selected_items with inventory check and idempotency.
     * Channel must be 'sms' or 'web' (maps to OrderChannel).
     *
     * @param array<int, array{menu_item_id: int, name: string, price: float, quantity: int}> $selectedItems
     * @param array{last_order_id?: int, last_order_reference?: string, last_order_cart_fingerprint?: string} $state
     * @param string $customerName optional; defaults to 'Anonymous' when not provided
     * @param string|null $externalId optional; stored on order for listing "my orders" when tracking
     * @return array{order: Order, reference: string}
     * @throws ChatbotInventoryException when any item is sold out or quantity exceeds units_today
     */
    public function createOrder(array $selectedItems, string $channel, array $state = [], string $customerName = 'Anonymous', ?string $externalId = null): array
    {
        $selectedItems = $this->normalizeItems($selectedItems);
        if (empty($selectedItems)) {
            throw new ChatbotInventoryException('No items to order.');
        }

        $fingerprint = $this->cartFingerprint($selectedItems);
        if (isset($state['last_order_id'], $state['last_order_reference'], $state['last_order_cart_fingerprint'])
            && $state['last_order_cart_fingerprint'] === $fingerprint) {
            $order = Order::find($state['last_order_id']);
            if ($order !== null && $order->reference === ($state['last_order_reference'] ?? null)) {
                return ['order' => $order, 'reference' => $order->reference];
            }
        }

        $orderChannel = $channel === 'web' ? OrderChannel::Web : OrderChannel::Sms;
        $menuItemIds = array_unique(array_column($selectedItems, 'menu_item_id'));
        $menuItems = MenuItem::whereIn('id', $menuItemIds)->get()->keyBy('id');

        foreach ($selectedItems as $line) {
            $id = $line['menu_item_id'];
            $qty = (int) $line['quantity'];
            $item = $menuItems->get($id);
            if ($item === null || $item->is_sold_out) {
                throw new ChatbotInventoryException("Item {$id} is not available or sold out.");
            }
            $available = (int) $item->units_today;
            if ($qty > $available) {
                throw new ChatbotInventoryException("Item {$item->name} has only {$available} left.");
            }
        }

        $reference = null;
        do {
            $reference = Str::random(8);
        } while (Order::where('reference', $reference)->exists());

        $total = 0.0;
        foreach ($selectedItems as $line) {
            $total += (float) $line['price'] * (int) $line['quantity'];
        }
        $total = round($total, 2);

        $order = null;
        $name = $customerName !== '' ? $customerName : 'Anonymous';
        $deliveryType = $state['delivery_type'] ?? 'pickup';
        $deliveryPlace = $state['delivery_place'] ?? null;
        $deliveryFee = array_key_exists('delivery_fee', $state) ? $state['delivery_fee'] : 0;
        if ($deliveryFee !== null) {
            $deliveryFee = (float) $deliveryFee;
        }
        $externalId = $externalId !== null && $externalId !== '' ? $externalId : null;
        DB::transaction(function () use ($reference, $orderChannel, $externalId, $total, $selectedItems, $name, $deliveryType, $deliveryPlace, $deliveryFee, &$order) {
            $order = Order::create([
                'reference' => $reference,
                'channel' => $orderChannel,
                'external_id' => $externalId,
                'status' => OrderStatus::Received,
                'payment_status' => PaymentStatus::Unpaid,
                'customer_name' => $name,
                'customer_phone' => '',
                'total' => $total,
                'delivery_type' => $deliveryType,
                'delivery_place' => $deliveryPlace,
                'delivery_fee' => $deliveryFee,
            ]);
            foreach ($selectedItems as $line) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'menu_item_id' => $line['menu_item_id'],
                    'name' => $line['name'],
                    'quantity' => (int) $line['quantity'],
                    'price' => (float) $line['price'],
                ]);
            }
        });

        event(new OrderUpdated($order));

        return ['order' => $order, 'reference' => $reference];
    }

    /**
     * @param array<int, array{menu_item_id: int, name: string, price: float, quantity: int}> $items
     */
    public function cartFingerprint(array $items): string
    {
        $items = $this->normalizeItems($items);
        $parts = [];
        foreach ($items as $i) {
            $parts[] = $i['menu_item_id'] . ':' . $i['quantity'];
        }
        sort($parts);
        return sha1(implode(',', $parts));
    }

    /**
     * @param array<int, array{menu_item_id?: int, name?: string, price?: float, quantity?: int}> $raw
     * @return list<array{menu_item_id: int, name: string, price: float, quantity: int}>
     */
    private function normalizeItems(array $raw): array
    {
        $out = [];
        foreach ($raw as $i) {
            if (is_array($i) && isset($i['menu_item_id'], $i['name'], $i['price'])) {
                $out[] = [
                    'menu_item_id' => (int) $i['menu_item_id'],
                    'name' => (string) $i['name'],
                    'price' => (float) $i['price'],
                    'quantity' => (int) ($i['quantity'] ?? 1),
                ];
            }
        }
        return $out;
    }
}
