<?php

namespace App\Http\Controllers;

use App\Enums\OrderStatus;
use App\Events\OrderUpdated;
use App\Models\DiningMarker;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class WalkinController extends Controller
{
    public function index(Request $request): Response
    {
        $orders = Order::with('orderItems')
            ->where('channel', 'walkin')
            ->whereNotIn('status', [OrderStatus::Completed, OrderStatus::Cancelled])
            ->orderByDesc('created_at')
            ->get();

        $markers = DiningMarker::query()
            ->orderBy('sort_order')
            ->orderBy('value')
            ->get();

        $orderMarkers = $markers->pluck('value')->values()->all();
        $diningMarkersList = $markers->map(fn ($m) => [
            'id' => $m->id,
            'value' => $m->value,
            'sort_order' => $m->sort_order,
        ])->values()->all();

        $highlight = $request->get('highlight');

        return Inertia::render('WalkinCounter', [
            'orders' => $orders,
            'orderMarkers' => $orderMarkers,
            'diningMarkersList' => $diningMarkersList,
            'highlight' => $highlight,
        ]);
    }

    public function updateOrderMarker(Request $request, Order $order): RedirectResponse
    {
        $validated = $request->validate([
            'order_marker' => [
                'nullable',
                'string',
                'max:64',
                function (string $attribute, ?string $value, \Closure $fail) {
                    if ($value !== null && $value !== '' && ! DiningMarker::where('value', $value)->exists()) {
                        $fail('The selected dining marker is invalid.');
                    }
                },
            ],
        ]);

        $marker = $validated['order_marker'] ?? null;
        $order->update(['order_marker' => $marker === '' ? null : $marker]);

        event(new OrderUpdated($order));

        return redirect()->back()->with('success', $marker ? 'Dining marker assigned.' : 'Dining marker cleared.');
    }
}
