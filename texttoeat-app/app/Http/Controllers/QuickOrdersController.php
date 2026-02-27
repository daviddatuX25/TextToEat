<?php

namespace App\Http\Controllers;

use App\Enums\OrderChannel;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\DeliveryArea;
use App\Models\DiningMarker;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PickupSlot;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class QuickOrdersController extends Controller
{
    public function create(): Response
    {
        $today = Carbon::today();
        $menuItems = MenuItem::query()
            ->whereDate('menu_date', $today)
            ->orderBy('category')
            ->orderBy('name')
            ->get();

        $deliveryAreas = DeliveryArea::query()
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        $pickupSlots = PickupSlot::query()
            ->orderBy('sort_order')
            ->orderBy('value')
            ->get()
            ->map(fn ($s) => ['id' => $s->id, 'value' => $s->value, 'sort_order' => $s->sort_order])
            ->values()
            ->all();

        $diningMarkers = DiningMarker::query()
            ->orderBy('sort_order')
            ->orderBy('value')
            ->get()
            ->map(fn ($m) => ['id' => $m->id, 'value' => $m->value, 'sort_order' => $m->sort_order])
            ->values()
            ->all();

        $diningMarkersUnavailable = Order::query()
            ->where('channel', OrderChannel::WalkIn)
            ->whereNotIn('status', [OrderStatus::Completed, OrderStatus::Cancelled])
            ->whereNotNull('order_marker')
            ->where('order_marker', '!=', '')
            ->pluck('order_marker')
            ->unique()
            ->values()
            ->all();

        return Inertia::render('QuickOrders', [
            'menuItems' => $menuItems,
            'deliveryAreas' => $deliveryAreas,
            'pickupSlots' => $pickupSlots,
            'diningMarkers' => $diningMarkers,
            'diningMarkersUnavailable' => $diningMarkersUnavailable,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'customer_name' => ['required', 'string', 'max:255'],
            'customer_phone' => ['nullable', 'string', 'max:64'],
            'fulfillment' => ['required', 'string', 'in:walkin,pickup,delivery'],
            'walkin_type' => ['nullable', 'string', 'in:dine_in,takeout'],
            'delivery_place' => ['nullable', 'string', 'max:255'],
            'delivery_fee' => ['nullable', 'numeric', 'min:0'],
            'pickup_slot' => ['nullable', 'string', 'max:64'],
            'order_marker' => ['nullable', 'string', 'max:64'],
            'items' => ['required', 'array'],
            'items.*.menu_item_id' => ['required', 'integer', 'exists:menu_items,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.name' => ['required', 'string'],
            'items.*.price' => ['required', 'numeric', 'min:0'],
        ]);

        $deliveryType = $validated['fulfillment'] === 'delivery' ? 'delivery' : 'pickup';
        $total = 0;
        foreach ($validated['items'] as $line) {
            $total += (float) $line['price'] * (int) $line['quantity'];
        }
        $total = round($total, 2);

        $order = Order::create([
            'reference' => 'Q' . strtoupper(substr(uniqid(), -6)),
            'channel' => OrderChannel::WalkIn,
            'status' => OrderStatus::Received,
            'payment_status' => PaymentStatus::Unpaid,
            'customer_name' => $validated['customer_name'],
            'customer_phone' => $validated['customer_phone'] ?? null,
            'total' => $total,
            'delivery_type' => $deliveryType,
            'delivery_place' => $validated['delivery_place'] ?? null,
            'delivery_fee' => isset($validated['delivery_fee']) ? (float) $validated['delivery_fee'] : null,
            'pickup_slot' => $validated['pickup_slot'] ?? null,
            'order_marker' => $validated['order_marker'] ?? null,
        ]);

        foreach ($validated['items'] as $line) {
            OrderItem::create([
                'order_id' => $order->id,
                'menu_item_id' => $line['menu_item_id'],
                'name' => $line['name'],
                'quantity' => (int) $line['quantity'],
                'price' => (float) $line['price'],
            ]);
        }

        return redirect()->route('portal.orders')->with('success', 'Order created.');
    }
}
