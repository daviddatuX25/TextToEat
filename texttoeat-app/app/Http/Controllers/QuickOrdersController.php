<?php

namespace App\Http\Controllers;

use App\Enums\OrderChannel;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Events\OrderUpdated;
use App\Models\DeliveryArea;
use App\Models\DiningMarker;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PickupSlot;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class QuickOrdersController extends Controller
{
    public function create(): Response
    {
        $menuItems = MenuItem::query()
            ->with('category')
            ->join('categories', 'menu_items.category_id', '=', 'categories.id')
            ->select('menu_items.*')
            ->orderBy('categories.sort_order')
            ->orderBy('categories.name')
            ->orderBy('menu_items.name')
            ->get()
            ->map(fn ($item) => array_merge($item->toArray(), ['category' => $item->category?->name ?? '']));

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
            'customer_name' => [Rule::requiredIf(!$request->boolean('is_walkin')), 'nullable', 'string', 'max:255'],
            'is_walkin' => ['sometimes', 'boolean'],
            'customer_phone' => ['nullable', 'string', 'max:50'],
            'delivery_type' => ['required', 'string', 'in:pickup,delivery'],
            'delivery_place' => ['nullable', 'string', 'max:255'],
            'delivery_fee' => ['nullable', 'numeric', 'min:0'],
            'pickup_slot' => ['nullable', 'string', 'max:' . PickupSlot::MAX_VALUE_LENGTH],
            'order_marker' => ['nullable', 'string', 'max:' . DiningMarker::MAX_VALUE_LENGTH],
            'items' => ['required', 'array', 'min:1'],
            'items.*.menu_item_id' => ['required', 'integer', 'exists:menu_items,id'],
            'items.*.name' => ['required', 'string', 'max:255'],
            'items.*.price' => ['required', 'numeric', 'min:0'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        $items = $validated['items'];
        $total = 0;
        foreach ($items as $line) {
            $total += (float) $line['price'] * (int) $line['quantity'];
        }
        $total = round($total, 2);

        $deliveryType = $validated['delivery_type'];
        $deliveryPlace = $deliveryType === 'delivery' ? ($validated['delivery_place'] ?? null) : null;
        $deliveryFee = array_key_exists('delivery_fee', $validated) && $validated['delivery_fee'] !== null && $validated['delivery_fee'] !== ''
            ? (float) $validated['delivery_fee']
            : ($deliveryPlace === 'Other (paid on delivery)' ? null : 0);
        $pickupSlot = $deliveryType === 'pickup' ? ($validated['pickup_slot'] ?? null) : null;
        $orderMarker = $validated['order_marker'] ?? null;
        $customerPhone = isset($validated['customer_phone']) ? (string) $validated['customer_phone'] : '';
        $customerName = trim((string) ($validated['customer_name'] ?? '')) ?: 'Walk-in';

        $reference = null;
        do {
            $reference = strtoupper(Str::random(7));
        } while (Order::where('reference', $reference)->exists());

        $order = Order::create([
            'reference' => $reference,
            'channel' => OrderChannel::WalkIn,
            'status' => OrderStatus::Received,
            'payment_status' => PaymentStatus::Unpaid,
            'customer_name' => $customerName,
            'customer_phone' => $customerPhone,
            'total' => $total,
            'delivery_type' => $deliveryType,
            'delivery_place' => $deliveryPlace,
            'delivery_fee' => $deliveryFee,
            'pickup_slot' => $pickupSlot === '' ? null : $pickupSlot,
            'order_marker' => $orderMarker === '' ? null : $orderMarker,
        ]);

        foreach ($items as $line) {
            $menuItem = MenuItem::with('category')->find($line['menu_item_id']);
            OrderItem::create([
                'order_id' => $order->id,
                'menu_item_id' => (int) $line['menu_item_id'],
                'name' => $line['name'],
                'category_name' => $menuItem?->category?->name,
                'quantity' => (int) $line['quantity'],
                'price' => (float) $line['price'],
            ]);
        }

        event(new OrderUpdated($order, true, false));

        return redirect()->route('portal.orders')->with('success', 'Order ' . $reference . ' created.');
    }
}
