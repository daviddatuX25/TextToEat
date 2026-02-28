<?php

namespace App\Http\Controllers;

use App\Enums\OrderStatus;
use App\Events\OrderUpdated;
use App\Models\Order;
use App\Models\PickupSlot;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class PickupController extends Controller
{
    public function index(Request $request): Response
    {
        $orders = Order::with('orderItems')
            ->where('delivery_type', 'pickup')
            ->whereNotIn('status', [OrderStatus::Completed, OrderStatus::Cancelled])
            ->orderByDesc('created_at')
            ->get();

        $slots = PickupSlot::query()
            ->orderBy('sort_order')
            ->orderBy('value')
            ->get();

        $pickupSlots = $slots->pluck('value')->values()->all();
        $pickupSlotsList = $slots->map(fn ($s) => [
            'id' => $s->id,
            'value' => $s->value,
            'sort_order' => $s->sort_order,
        ])->values()->all();

        $highlight = $request->get('highlight');

        return Inertia::render('PickupCounter', [
            'orders' => $orders,
            'pickupSlots' => $pickupSlots,
            'pickupSlotsList' => $pickupSlotsList,
            'highlight' => $highlight,
        ]);
    }

    public function updateSlot(Request $request, Order $order): RedirectResponse
    {
        $validated = $request->validate([
            'pickup_slot' => [
                'nullable',
                'string',
                'max:64',
                function (string $attribute, ?string $value, \Closure $fail) use ($order) {
                    if ($value === null || $value === '') {
                        return;
                    }
                    if (! PickupSlot::where('value', $value)->exists()) {
                        $fail('The selected pickup slot is invalid.');
                        return;
                    }
                    $otherExists = Order::where('pickup_slot', $value)
                        ->whereNotIn('status', [OrderStatus::Completed, OrderStatus::Cancelled])
                        ->where('id', '!=', $order->id)
                        ->exists();
                    if ($otherExists) {
                        $fail('This slot is already taken.');
                    }
                },
            ],
        ]);

        $slot = $validated['pickup_slot'] ?? null;
        $order->update(['pickup_slot' => $slot === '' ? null : $slot]);

        event(new OrderUpdated($order));

        return redirect()->back()->with('success', $slot ? 'Pickup slot assigned.' : 'Pickup slot cleared.');
    }
}
