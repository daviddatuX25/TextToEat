<?php

namespace App\Http\Controllers;

use App\Enums\OrderChannel;
use App\Enums\OrderStatus;
use App\Events\OrderUpdated;
use App\Enums\PaymentStatus;
use App\Http\Requests\StoreOrderRequest;
use App\Models\Order;
use App\Models\OrderItem;
use App\Services\MenuItemStockService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class CheckoutController extends Controller
{
    public function __construct(
        private MenuItemStockService $stockService
    ) {}
    public function index(): Response|RedirectResponse
    {
        $cart = session('customer_cart', []);

        if (empty($cart)) {
            return redirect()->route('menu');
        }

        $total = 0;
        foreach ($cart as $line) {
            $total += (float) $line['price'] * (int) $line['quantity'];
        }

        return Inertia::render('Checkout', [
            'cart' => $cart,
            'total' => round($total, 2),
        ]);
    }

    public function store(StoreOrderRequest $request): RedirectResponse
    {
        $cart = session('customer_cart', []);

        if (empty($cart)) {
            return redirect()->route('menu')->with('error', 'Your cart is empty.');
        }

        $menuItemIds = array_unique(array_column($cart, 'menu_item_id'));
        $virtualAvailable = $this->stockService->getVirtualAvailableForToday($menuItemIds);
        foreach ($cart as $line) {
            $id = (int) $line['menu_item_id'];
            $qty = (int) $line['quantity'];
            $available = (int) ($virtualAvailable[$id] ?? 0);
            if ($qty > $available) {
                return redirect()->route('checkout')->with('error', 'Some items have limited availability. Please check the menu and try again.');
            }
        }

        $validated = $request->validated();
        $total = 0;
        foreach ($cart as $line) {
            $total += (float) $line['price'] * (int) $line['quantity'];
        }
        $total = round($total, 2);

        $reference = null;
        do {
            $reference = Str::random(8);
        } while (Order::where('reference', $reference)->exists());

        $deliveryType = $validated['delivery_type'] ?? 'pickup';
        $deliveryPlace = $validated['delivery_place'] ?? null;
        $deliveryFee = array_key_exists('delivery_fee', $validated) && $validated['delivery_fee'] !== null && $validated['delivery_fee'] !== ''
            ? (float) $validated['delivery_fee']
            : ($deliveryPlace === 'Other (paid on delivery)' ? null : 0);

        DB::transaction(function () use ($reference, $validated, $total, $cart, $deliveryType, $deliveryPlace, $deliveryFee) {
            $order = Order::create([
                'reference' => $reference,
                'channel' => OrderChannel::Web,
                'status' => OrderStatus::Received,
                'payment_status' => PaymentStatus::Unpaid,
                'customer_name' => $validated['customer_name'],
                'customer_phone' => $validated['customer_phone'],
                'total' => $total,
                'delivery_type' => $deliveryType,
                'delivery_place' => $deliveryPlace,
                'delivery_fee' => $deliveryFee,
            ]);

            foreach ($cart as $line) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'menu_item_id' => $line['menu_item_id'],
                    'name' => $line['name'],
                    'quantity' => (int) $line['quantity'],
                    'price' => (float) $line['price'],
                ]);
            }
        });

        session()->forget('customer_cart');

        $order = Order::where('reference', $reference)->first();
        if ($order) {
            event(new OrderUpdated($order));
        }

        return redirect()->route('order.confirmation', ['reference' => $reference]);
    }

    public function confirmation(string $reference): Response
    {
        $order = Order::where('reference', $reference)->firstOrFail();

        return Inertia::render('OrderConfirmation', [
            'reference' => $order->reference,
        ]);
    }
}
