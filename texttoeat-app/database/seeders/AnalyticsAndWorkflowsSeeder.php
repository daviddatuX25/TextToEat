<?php

namespace Database\Seeders;

use App\Enums\OrderChannel;
use App\Enums\OrderStatus;
use App\Models\ActionLog;
use App\Models\DeliveryArea;
use App\Models\DiningMarker;
use App\Models\MenuItem;
use App\Models\MenuItemDailyStock;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PickupSlot;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Demo-only: seeds orders, order items, and action logs across multiple days
 * so that Dashboard, Analytics, Reports, Deliveries, Pickup, Walk-in have data.
 *
 * Not run by default. For demo/presentation:
 *   php artisan db:seed --class=AnalyticsAndWorkflowsSeeder
 *
 * Requires: users, menu items (FilipinoMealsSeeder), pickup slots, delivery areas, dining markers.
 */
class AnalyticsAndWorkflowsSeeder extends Seeder
{
    private const DAYS_BACK = 45;

    private const ORDERS_PER_DAY_MIN = 150;

    private const ORDERS_PER_DAY_MAX = 200;

    private const MAX_ACTIVE_ORDERS_TODAY = 15;

    private const CHANNELS = ['sms', 'messenger', 'web', 'walkin'];

    private const STATUSES_WEIGHTED = [
        OrderStatus::Completed->value => 55,
        OrderStatus::Cancelled->value => 8,
        OrderStatus::Received->value => 12,
        OrderStatus::Preparing->value => 10,
        OrderStatus::Ready->value => 8,
        OrderStatus::OnTheWay->value => 7,
    ];

    /** @var array<int, array{name: string, price: float}> */
    private array $menuItemNamesPrices = [];

    /** @var array<int, int> Menu item id => units_set (today's stock) for capping order quantities. */
    private array $unitsSetPerItem = [];

    /** @var array<int, int> Reserved quantity per menu item (today's active orders only). */
    private array $reservedPerItemToday = [];

    /** @var array<int, int> Sold quantity per menu item (today's completed/cancelled orders). */
    private array $soldPerItemToday = [];

    /** @var array<string> */
    private array $pickupSlots = [];

    /** @var array<array{name: string, fee: float|null}> */
    private array $deliveryAreas = [];

    /** @var array<string> */
    private array $diningMarkers = [];

    private ?int $userId = null;

    public function run(): void
    {
        $this->loadDependencies();
        if ($this->menuItemNamesPrices === []) {
            $this->command->warn('No menu items for today found. Run FilipinoMealsSeeder first.');
            return;
        }

        $this->command->info('Seeding orders, order items, and action logs for analytics and workflows...');
        $orderCount = 0;
        $from = Carbon::today()->subDays(self::DAYS_BACK)->startOfDay();
        $to = Carbon::today()->endOfDay();

        $activeCountToday = 0;
        $dummyRef = 0;
        for ($day = 0; $day <= self::DAYS_BACK; $day++) {
            $date = Carbon::today()->subDays(self::DAYS_BACK - $day);
            $ordersPerDay = $this->ordersCountForDay($day);
            for ($i = 0; $i < $ordersPerDay; $i++) {
                $activeRef = $date->isToday() ? $activeCountToday : $dummyRef;
                $this->createOrderWithItemsAndLogs($date, $activeRef);
                $orderCount++;
            }
        }

        $this->syncTodayStockFromSeededOrders();

        $this->command->info("Created {$orderCount} orders with items and action logs.");
    }

    private function loadDependencies(): void
    {
        $today = Carbon::today();
        $items = MenuItem::query()->whereDate('menu_date', $today)->get();
        foreach ($items as $item) {
            $this->menuItemNamesPrices[$item->id] = ['name' => $item->name, 'price' => (float) $item->price];
            $this->unitsSetPerItem[$item->id] = (int) $item->units_today;
            $this->reservedPerItemToday[$item->id] = 0;
            $this->soldPerItemToday[$item->id] = 0;
        }
        $this->pickupSlots = PickupSlot::query()->pluck('value')->all();
        $this->deliveryAreas = DeliveryArea::query()->get()->map(fn ($a) => [
            'name' => $a->name,
            'fee' => $a->is_free ? 0.0 : (float) ($a->fee ?? 0),
        ])->all();
        $this->diningMarkers = DiningMarker::query()->pluck('value')->all();
        $user = User::query()->first();
        $this->userId = $user?->id;
    }

    private function ordersCountForDay(int $dayIndex): int
    {
        return random_int(self::ORDERS_PER_DAY_MIN, self::ORDERS_PER_DAY_MAX);
    }

    /**
     * @param int $activeCountToday Pass by reference when $date is today; use dummy ref otherwise so only today's active count is tracked.
     */
    private function createOrderWithItemsAndLogs(Carbon $date, int &$activeCountToday): void
    {
        $channel = $this->randomChannel();
        $status = $this->resolveStatusForDate($date, $activeCountToday);
        $isWalkin = $channel === OrderChannel::WalkIn->value;
        $deliveryType = $isWalkin ? 'pickup' : ($this->randomBool(0.4) ? 'delivery' : 'pickup');
        $area = $this->deliveryAreas[array_rand($this->deliveryAreas)] ?? ['name' => 'Poblacion', 'fee' => 25.0];
        $deliveryFee = $deliveryType === 'delivery' ? $area['fee'] : null;
        $pickupSlot = $deliveryType === 'pickup' && $this->pickupSlots !== [] ? $this->pickupSlots[array_rand($this->pickupSlots)] : null;
        $orderMarker = $isWalkin && $this->diningMarkers !== [] ? $this->diningMarkers[array_rand($this->diningMarkers)] : null;
        $paymentStatus = in_array($status, [OrderStatus::Completed->value], true) ? ($this->randomBool(0.6) ? 'paid' : 'unpaid') : 'unpaid';

        $createdAt = $date->copy()->addMinutes(random_int(0, 1439));
        $updatedAt = $createdAt->copy();
        if (in_array($status, [OrderStatus::Completed->value, OrderStatus::Cancelled->value], true)) {
            $updatedAt = $createdAt->copy()->addMinutes(random_int(15, 120));
        }

        $reference = $this->uniqueReference();
        $availablePerItem = null;
        if ($date->isToday()) {
            foreach ($this->unitsSetPerItem as $id => $set) {
                $res = $this->reservedPerItemToday[$id] ?? 0;
                $sold = $this->soldPerItemToday[$id] ?? 0;
                $availablePerItem[$id] = max(0, $set - $res - $sold);
            }
            // For today, always cap order quantities by available stock so we never exceed units_set per item.
            $itemRows = $this->randomOrderItems($availablePerItem);
            if ($itemRows === [] || array_sum(array_column($itemRows, 'quantity')) === 0) {
                if ($this->isActiveStatus($status)) {
                    $activeCountToday = max(0, $activeCountToday - 1);
                }
                return;
            }
        } else {
            $itemRows = $this->randomOrderItems();
        }
        $total = array_sum(array_column($itemRows, 'subtotal'));

        $order = Order::query()->create([
            'reference' => $reference,
            'channel' => $channel,
            'status' => $status,
            'payment_status' => $paymentStatus,
            'customer_name' => $this->randomName(),
            'customer_phone' => $this->randomPhone(),
            'total' => round($total, 2),
            'delivery_type' => $deliveryType,
            'delivery_place' => $deliveryType === 'delivery' ? $area['name'] : null,
            'delivery_fee' => $deliveryFee,
            'pickup_slot' => $pickupSlot,
            'order_marker' => $orderMarker,
            'external_id' => null,
            'created_at' => $createdAt,
            'updated_at' => $updatedAt,
        ]);

        foreach ($itemRows as $row) {
            $menuItem = MenuItem::with('category')->find($row['menu_item_id']);
            OrderItem::query()->create([
                'order_id' => $order->id,
                'menu_item_id' => $row['menu_item_id'],
                'name' => $row['name'],
                'category_name' => $menuItem?->category?->name,
                'quantity' => $row['quantity'],
                'price' => $row['price'],
            ]);
            if ($date->isToday() && $row['menu_item_id']) {
                $id = $row['menu_item_id'];
                $qty = $row['quantity'];
                $set = $this->unitsSetPerItem[$id] ?? 0;
                $sold = $this->soldPerItemToday[$id] ?? 0;
                if ($this->isActiveStatus($status)) {
                    $this->reservedPerItemToday[$id] = ($this->reservedPerItemToday[$id] ?? 0) + $qty;
                } elseif (in_array($status, [OrderStatus::Completed->value, OrderStatus::Cancelled->value], true)) {
                    $this->soldPerItemToday[$id] = min($set, $sold + $qty);
                }
            }
        }

        $this->createActionLogsForOrder($order, $createdAt, $updatedAt, $status);
    }

    private function randomChannel(): string
    {
        return (string) (self::CHANNELS[array_rand(self::CHANNELS)]);
    }

    private function randomStatus(): string
    {
        $r = random_int(1, 100);
        $cum = 0;
        foreach (self::STATUSES_WEIGHTED as $status => $weight) {
            $cum += $weight;
            if ($r <= $cum) {
                return $status;
            }
        }
        return OrderStatus::Completed->value;
    }

    private function resolveStatusForDate(Carbon $date, int &$activeCountToday): string
    {
        if (! $date->isToday()) {
            return $this->randomStatus();
        }
        if ($activeCountToday >= self::MAX_ACTIVE_ORDERS_TODAY) {
            return $this->randomCompletedOrCancelled();
        }
        $status = $this->randomStatus();
        if ($this->isActiveStatus($status)) {
            $activeCountToday++;
        }

        return $status;
    }

    private function isActiveStatus(string $status): bool
    {
        return in_array($status, [
            OrderStatus::Received->value,
            OrderStatus::Preparing->value,
            OrderStatus::Ready->value,
            OrderStatus::OnTheWay->value,
        ], true);
    }

    private function randomCompletedOrCancelled(): string
    {
        return $this->randomBool(0.92) ? OrderStatus::Completed->value : OrderStatus::Cancelled->value;
    }

    private function randomBool(float $probability): bool
    {
        return random_int(0, 999) / 1000 < $probability;
    }

    private function uniqueReference(): string
    {
        do {
            $ref = strtoupper(Str::random(8));
        } while (Order::query()->where('reference', $ref)->exists());
        return $ref;
    }

    private function randomName(): string
    {
        $names = ['Maria Santos', 'Juan Dela Cruz', 'Rosa Garcia', 'Pedro Reyes', 'Ana Lopez', 'Jose Mendoza', 'Liza Torres', 'Carlos Ramos', 'Elena Cruz', 'Miguel Fernandez'];
        return $names[array_rand($names)];
    }

    private function randomPhone(): string
    {
        return '+63' . (string) random_int(9000000000, 9999999999);
    }

    /**
     * @param  array<int, int>|null  $availablePerItem  When set (e.g. for today's active orders), only include items with available > 0 and cap quantity so we don't exceed stock.
     * @return list<array{menu_item_id: int|null, name: string, quantity: int, price: float, subtotal: float}>
     */
    private function randomOrderItems(?array $availablePerItem = null): array
    {
        $count = random_int(1, 4);
        $candidates = $this->menuItemNamesPrices;
        if ($availablePerItem !== null) {
            $candidates = array_filter(
                $candidates,
                fn ($_, $id) => ($availablePerItem[$id] ?? 0) > 0,
                ARRAY_FILTER_USE_BOTH
            );
            if ($candidates === []) {
                return [];
            }
        }
        $keys = array_rand($candidates, min($count, count($candidates)));
        if (! is_array($keys)) {
            $keys = [$keys];
        }
        $out = [];
        foreach ($keys as $menuItemId) {
            $row = $this->menuItemNamesPrices[$menuItemId];
            $qty = random_int(1, 3);
            if ($availablePerItem !== null && isset($availablePerItem[$menuItemId])) {
                $qty = min($qty, $availablePerItem[$menuItemId]);
                if ($qty <= 0) {
                    continue;
                }
            }
            $price = $row['price'];
            $out[] = [
                'menu_item_id' => $menuItemId,
                'name' => $row['name'],
                'quantity' => $qty,
                'price' => $price,
                'subtotal' => $price * $qty,
            ];
        }
        return $out;
    }

    /**
     * Sync menu_item_daily_stock.units_sold and menu_items.units_today for today so the app's
     * virtual available matches the seeded completed/cancelled orders.
     */
    private function syncTodayStockFromSeededOrders(): void
    {
        $today = Carbon::today();
        foreach (array_keys($this->unitsSetPerItem) as $menuItemId) {
            $sold = $this->soldPerItemToday[$menuItemId] ?? 0;
            $set = $this->unitsSetPerItem[$menuItemId] ?? 0;
            $leftover = max(0, $set - $sold);
            MenuItemDailyStock::updateOrCreate(
                [
                    'menu_item_id' => $menuItemId,
                    'menu_date' => $today,
                ],
                [
                    'units_set' => $set,
                    'units_sold' => $sold,
                    'units_leftover' => $leftover,
                ]
            );
            MenuItem::query()
                ->where('id', $menuItemId)
                ->whereDate('menu_date', $today)
                ->update(['units_today' => $leftover]);
        }
    }

    private function createActionLogsForOrder(Order $order, Carbon $createdAt, Carbon $updatedAt, string $finalStatus): void
    {
        $orderId = $order->id;
        $base = [
            'user_id' => $this->userId,
            'action' => 'order_updated',
            'model' => 'Order',
            'model_id' => $orderId,
        ];

        $transitions = [];
        if ($finalStatus === OrderStatus::Cancelled->value) {
            $transitions = [['from' => 'received', 'to' => 'cancelled', 'offset_min' => [1, 30]]];
        } elseif (in_array($finalStatus, [OrderStatus::Received->value, OrderStatus::Preparing->value], true)) {
            $transitions = [];
        } else {
            $transitions = [
                ['from' => 'received', 'to' => 'preparing', 'offset_min' => [5, 20]],
                ['from' => 'preparing', 'to' => 'ready', 'offset_min' => [10, 35]],
            ];
            $isDelivery = in_array($order->channel, ['sms', 'messenger', 'web'], true) && $order->delivery_type === 'delivery';
            if ($finalStatus === OrderStatus::OnTheWay->value) {
                $transitions[] = ['from' => 'ready', 'to' => 'on_the_way', 'offset_min' => [2, 15]];
            } elseif ($finalStatus === OrderStatus::Completed->value) {
                if ($isDelivery) {
                    $transitions[] = ['from' => 'ready', 'to' => 'on_the_way', 'offset_min' => [2, 15]];
                    $transitions[] = ['from' => 'on_the_way', 'to' => 'completed', 'offset_min' => [5, 25]];
                } else {
                    $transitions[] = ['from' => 'ready', 'to' => 'completed', 'offset_min' => [2, 15]];
                }
            }
        }

        $at = $createdAt->copy();
        foreach ($transitions as $t) {
            [$min, $max] = $t['offset_min'];
            if ($min > 0 || $max > 0) {
                $at = $at->copy()->addMinutes(random_int($min, max($min, $max)));
            }
            if ($at->gt($updatedAt)) {
                $at = $updatedAt->copy();
            }
            if ($t['from'] === $t['to']) {
                continue;
            }
            ActionLog::query()->create(array_merge($base, [
                'payload' => [
                    'from_status' => $t['from'],
                    'to_status' => $t['to'],
                    'from_payment_status' => 'unpaid',
                    'to_payment_status' => $t['to'] === 'completed' ? $order->payment_status : 'unpaid',
                ],
                'created_at' => $at,
                'updated_at' => $at,
            ]));
        }
    }
}
