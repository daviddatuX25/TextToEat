<?php

namespace App\Http\Controllers;

use App\Enums\OrderChannel;
use App\Enums\OrderStatus;
use App\Events\OrderUpdated;
use App\Models\ActionLog;
use App\Models\OrderItem;
use App\Services\OrderStatusNotificationService;
use App\Models\DeliveryArea;
use App\Models\DiningMarker;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\PickupSlot;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OrdersController extends Controller
{
    public function index(Request $request): Response
    {
        $orders = Order::with('orderItems')
            ->whereNotIn('status', [OrderStatus::Completed, OrderStatus::Cancelled])
            ->orderByDesc('created_at')
            ->get();

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

        return Inertia::render('Orders', [
            'orders' => $orders,
            'highlight' => $request->get('highlight'),
            'menuItems' => $menuItems,
            'deliveryAreas' => $deliveryAreas,
            'pickupSlots' => $pickupSlots,
            'diningMarkers' => $diningMarkers,
            'diningMarkersUnavailable' => $diningMarkersUnavailable,
        ]);
    }

    public function completedIndex(): Response
    {
        $orders = Order::with('orderItems')
            ->whereIn('status', [OrderStatus::Completed, OrderStatus::Cancelled])
            ->orderByDesc('updated_at')
            ->get();

        return Inertia::render('CompletedOrders', [
            'orders' => $orders,
        ]);
    }

    public function update(Request $request, Order $order): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['sometimes', 'string', 'in:received,confirmed,ready,on_the_way,completed,cancelled'],
            'payment_status' => ['sometimes', 'string', 'in:unpaid,paid'],
        ]);

        $originalStatus = $order->status;
        $originalPaymentStatus = $order->payment_status;

        if (isset($validated['payment_status'])) {
            $order->payment_status = $validated['payment_status'];
        }
        if (isset($validated['status'])) {
            $effectivePayment = $order->payment_status;
            if ($validated['status'] === 'completed' && $effectivePayment !== 'paid') {
                return redirect()->back()->with('error', 'Mark the order as paid before completing.');
            }
            $order->status = $validated['status'];
        }
        $order->save();

        if ($originalStatus !== $order->status && (string) $order->status === OrderStatus::Completed->value) {
            $today = Carbon::today();
            foreach ($order->orderItems as $orderItem) {
                if ($orderItem->menu_item_id) {
                    MenuItem::query()
                        ->where('id', $orderItem->menu_item_id)
                        ->whereDate('menu_date', $today)
                        ->decrement('units_today', $orderItem->quantity);
                }
            }
        }

        event(new OrderUpdated($order));

        if (
            ($originalStatus !== $order->status)
            || ($originalPaymentStatus !== $order->payment_status)
        ) {
            ActionLog::create([
                'user_id' => $request->user()?->id,
                'action' => 'order_updated',
                'model' => 'Order',
                'model_id' => $order->id,
                'payload' => [
                    'from_status' => $originalStatus,
                    'to_status' => $order->status,
                    'from_payment_status' => $originalPaymentStatus,
                    'to_payment_status' => $order->payment_status,
                ],
            ]);

            if ($originalStatus !== $order->status && \in_array((string) $order->channel, ['sms', 'messenger'], true)) {
                app(OrderStatusNotificationService::class)->maybeNotify($order, (string) $originalStatus);
            }
        }

        return redirect()->back()->with('success', 'Order updated.');
    }
}
