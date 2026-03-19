<?php

namespace App\Http\Controllers;

use App\Enums\OrderChannel;
use App\Enums\OrderStatus;
use App\Events\OrderUpdated;
use App\Models\ActionLog;
use App\Support\DatabaseDialect;
use App\Models\OrderItem;
use App\Services\OrderStatusNotificationService;
use App\Models\DeliveryArea;
use App\Models\DiningMarker;
use App\Models\MenuItem;
use App\Models\MenuItemDailyStock;
use App\Models\Order;
use App\Models\PickupSlot;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
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

        $menuItems = MenuItem::query()
            ->with('category')
            ->join('categories', 'menu_items.category_id', '=', 'categories.id')
            ->select('menu_items.*')
            ->orderBy('categories.sort_order')
            ->orderBy('categories.name')
            ->orderBy('menu_items.name')
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

    public function completedIndex(Request $request): Response
    {
        $validated = $request->validate([
            'status' => ['sometimes', 'string', 'in:all,completed,cancelled'],
            'channel' => ['sometimes', 'array'],
            'channel.*' => ['string', 'in:sms,messenger,web,walkin'],
            'date_from' => ['sometimes', 'nullable', 'date'],
            'date_to' => ['sometimes', 'nullable', 'date', 'after_or_equal:date_from'],
            'search' => ['sometimes', 'nullable', 'string', 'max:100'],
            'sort' => ['sometimes', 'string', 'in:created_at,updated_at,total,reference'],
            'direction' => ['sometimes', 'string', 'in:asc,desc'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $query = Order::with('orderItems')
            ->whereIn('status', [OrderStatus::Completed, OrderStatus::Cancelled]);

        $statusFilter = $validated['status'] ?? 'all';
        if ($statusFilter === 'completed') {
            $query->where('status', OrderStatus::Completed);
        } elseif ($statusFilter === 'cancelled') {
            $query->where('status', OrderStatus::Cancelled);
        }

        if (! empty($validated['channel'] ?? [])) {
            $query->whereIn('channel', $validated['channel']);
        }

        if (! empty($validated['date_from'] ?? null)) {
            $query->whereDate('created_at', '>=', $validated['date_from']);
        }
        if (! empty($validated['date_to'] ?? null)) {
            $query->whereDate('created_at', '<=', $validated['date_to']);
        }

        $search = trim($validated['search'] ?? '');
        if ($search !== '') {
            DatabaseDialect::addCaseInsensitiveLikeOr(
                $query,
                ['customer_name', 'customer_phone', 'reference'],
                '%' . $search . '%'
            );
        }

        $sort = $validated['sort'] ?? 'updated_at';
        $direction = $validated['direction'] ?? 'desc';
        $query->orderBy($sort, $direction);

        $perPage = (int) min(50, max(10, $request->input('per_page', 20)));
        $orders = $query->paginate($perPage)->withQueryString();

        $filters = [
            'status' => $statusFilter,
            'channel' => $validated['channel'] ?? [],
            'date_from' => $validated['date_from'] ?? '',
            'date_to' => $validated['date_to'] ?? '',
            'search' => $search,
            'sort' => $sort,
            'direction' => $direction,
        ];

        return Inertia::render('CompletedOrders', [
            'orders' => $orders,
            'filters' => $filters,
        ]);
    }

    public function update(Request $request, Order $order): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['sometimes', 'string', 'in:received,preparing,ready,on_the_way,completed,cancelled'],
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
            DB::transaction(function () use ($order, $today): void {
                foreach ($order->orderItems as $orderItem) {
                    if ($orderItem->menu_item_id) {
                        MenuItemDailyStock::firstOrCreate(
                            [
                                'menu_item_id' => $orderItem->menu_item_id,
                                'menu_date' => $today,
                            ],
                            [
                                'units_set' => 0,
                                'units_sold' => 0,
                                'units_leftover' => 0,
                            ]
                        );
                        MenuItemDailyStock::query()
                            ->where('menu_item_id', $orderItem->menu_item_id)
                            ->whereDate('menu_date', $today)
                            ->increment('units_sold', $orderItem->quantity);
                    }
                }
            });
        }

        $statusChanged = $originalStatus !== $order->status;
        $paymentStatusChanged = $originalPaymentStatus !== $order->payment_status;
        event(new OrderUpdated($order, $statusChanged, $paymentStatusChanged));

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
