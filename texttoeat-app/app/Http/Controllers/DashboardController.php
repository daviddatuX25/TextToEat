<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Carbon\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $today = Carbon::today();

        $ordersToday = Order::query()
            ->whereDate('created_at', $today)
            ->count();

        $readyDelivery = Order::query()
            ->where('delivery_type', 'delivery')
            ->where('status', 'ready')
            ->count();

        $readyPickup = Order::query()
            ->where('delivery_type', 'pickup')
            ->where('status', 'ready')
            ->count();

        $completedToday = Order::query()
            ->where('status', 'completed')
            ->whereDate('updated_at', $today)
            ->count();

        return Inertia::render('Dashboard', [
            'metrics' => [
                'orders_today' => $ordersToday,
                'ready_delivery' => $readyDelivery,
                'ready_pickup' => $readyPickup,
                'completed_today' => $completedToday,
            ],
        ]);
    }
}
