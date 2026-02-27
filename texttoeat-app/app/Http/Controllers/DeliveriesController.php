<?php

namespace App\Http\Controllers;

use App\Enums\OrderStatus;
use App\Models\DeliveryArea;
use App\Models\Order;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DeliveriesController extends Controller
{
    public function index(Request $request): Response
    {
        $orders = Order::with('orderItems')
            ->where('delivery_type', 'delivery')
            ->whereNotIn('status', [OrderStatus::Completed, OrderStatus::Cancelled])
            ->orderByDesc('created_at')
            ->get();

        $deliveryAreas = DeliveryArea::query()
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        $highlight = $request->get('highlight');

        return Inertia::render('Deliveries', [
            'orders' => $orders,
            'deliveryAreas' => $deliveryAreas,
            'highlight' => $highlight,
        ]);
    }
}
