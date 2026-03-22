<?php

namespace Database\Seeders;

use App\Enums\OrderChannel;
use App\Enums\OrderStatus;
use App\Models\ActionLog;
use App\Models\Category;
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
 * Demo-only: seeds historical orders, order items, and action logs for analytics dashboards.
 *
 * **Catalog model (not per-day menu_items rows):** Each dish has a single `menu_items` row.
 * Per-day availability and caps are represented only in `menu_item_daily_stock` for
 * `(menu_item_id, menu_date)`. This matches REFRACTOR_MENU_SINGLE_ITEM_CATALOG_PLAN.md and
 * avoids duplicating the same dish across dozens of `menu_items` rows.
 *
 * Run: php artisan db:seed --class=AnalyticsAndWorkflowsSeeder
 *
 * Requires: users, pickup slots, delivery areas, dining markers.
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

    /** @var array<string, int> Meal name => single catalog menu_items.id (stable across days). */
    private array $catalogIdsByName = [];

    /**
     * Meal definitions (name, price, category, units_today, etc.) for catalog + daily stock.
     * Must match FilipinoMealsSeeder so today's menu is consistent when run after ProductionSeeder.
     *
     * @return list<array{name: string, price: float, category: string, image_url: string, units_today: int, is_sold_out: bool}>
     */
    private function getMealDefinitions(): array
    {
        return [
            ['name' => 'Chicken Adobo', 'price' => 125.00, 'category' => 'Ulam', 'image_url' => 'https://picsum.photos/seed/chicken-adobo/800/600', 'units_today' => 30, 'is_sold_out' => false],
            ['name' => 'Pork Sinigang na Baboy', 'price' => 135.00, 'category' => 'Ulam', 'image_url' => 'https://picsum.photos/seed/sinigang/800/600', 'units_today' => 25, 'is_sold_out' => false],
            ['name' => 'Lechon Kawali', 'price' => 185.00, 'category' => 'Ulam', 'image_url' => 'https://picsum.photos/seed/lechon/800/600', 'units_today' => 20, 'is_sold_out' => false],
            ['name' => 'Kare-Kare', 'price' => 165.00, 'category' => 'Ulam', 'image_url' => 'https://picsum.photos/seed/kare-kare/800/600', 'units_today' => 18, 'is_sold_out' => false],
            ['name' => 'Beef Caldereta', 'price' => 155.00, 'category' => 'Ulam', 'image_url' => 'https://picsum.photos/seed/caldereta/800/600', 'units_today' => 22, 'is_sold_out' => false],
            ['name' => 'Pork Sisig', 'price' => 145.00, 'category' => 'Ulam', 'image_url' => 'https://picsum.photos/seed/sisig/800/600', 'units_today' => 28, 'is_sold_out' => false],
            ['name' => 'Lumpiang Shanghai (6 pcs)', 'price' => 85.00, 'category' => 'Merienda', 'image_url' => 'https://picsum.photos/seed/lumpia/800/600', 'units_today' => 40, 'is_sold_out' => false],
            ['name' => 'Pancit Canton', 'price' => 95.00, 'category' => 'Noodles', 'image_url' => 'https://picsum.photos/seed/pancit/800/600', 'units_today' => 35, 'is_sold_out' => false],
            ['name' => 'Tapsilog', 'price' => 115.00, 'category' => 'Silog', 'image_url' => 'https://picsum.photos/seed/tapsilog/800/600', 'units_today' => 25, 'is_sold_out' => false],
            ['name' => 'Longsilog', 'price' => 95.00, 'category' => 'Silog', 'image_url' => 'https://picsum.photos/seed/longsilog/800/600', 'units_today' => 30, 'is_sold_out' => false],
            ['name' => 'Halo-Halo', 'price' => 75.00, 'category' => 'Dessert', 'image_url' => 'https://picsum.photos/seed/halo-halo/800/600', 'units_today' => 45, 'is_sold_out' => false],
            ['name' => 'Turon (2 pcs)', 'price' => 45.00, 'category' => 'Dessert', 'image_url' => 'https://picsum.photos/seed/turon/800/600', 'units_today' => 50, 'is_sold_out' => false],
            ['name' => 'Leche Flan', 'price' => 65.00, 'category' => 'Dessert', 'image_url' => 'https://picsum.photos/seed/leche-flan/800/600', 'units_today' => 20, 'is_sold_out' => false],
            ['name' => 'Dinuguan', 'price' => 105.00, 'category' => 'Ulam', 'image_url' => 'https://picsum.photos/seed/dinuguan/800/600', 'units_today' => 15, 'is_sold_out' => false],
            ['name' => 'Pinakbet', 'price' => 95.00, 'category' => 'Ulam', 'image_url' => 'https://picsum.photos/seed/pinakbet/800/600', 'units_today' => 25, 'is_sold_out' => false],
        ];
    }

    /**
     * Ensure one catalog row per meal name (stable menu_item_id for all days).
     * If legacy data has multiple rows per name, the lowest id is used.
     */
    private function ensureCatalog(): void
    {
        $today = Carbon::today(config('app.timezone'));
        $menuDateStr = $today->toDateString();
        $this->catalogIdsByName = [];

        foreach ($this->getMealDefinitions() as $meal) {
            $category = Category::firstOrCreate(['name' => $meal['category']], ['name' => $meal['category']]);
            $item = MenuItem::query()
                ->where('name', $meal['name'])
                ->orderBy('id')
                ->first();

            if ($item === null) {
                $item = MenuItem::query()->create([
                    'name' => $meal['name'],
                    'price' => $meal['price'],
                    'category_id' => $category->id,
                    'image_url' => $meal['image_url'],
                    'units_today' => $meal['units_today'],
                    'is_sold_out' => $meal['is_sold_out'],
                    'menu_date' => $menuDateStr,
                ]);
            } else {
                $item->update([
                    'price' => $meal['price'],
                    'category_id' => $category->id,
                    'image_url' => $meal['image_url'],
                    'menu_date' => $menuDateStr,
                ]);
            }

            $this->catalogIdsByName[$meal['name']] = $item->id;
        }
    }

    /**
     * Per-day stock only (menu_item_daily_stock). Does not create new menu_items rows.
     */
    private function ensureStockForDate(Carbon $date): void
    {
        $menuDate = $date->toDateString();
        $defsByName = collect($this->getMealDefinitions())->keyBy('name');

        foreach ($this->catalogIdsByName as $name => $menuItemId) {
            $meal = $defsByName->get($name);
            if ($meal === null) {
                continue;
            }
            MenuItemDailyStock::updateOrCreate(
                [
                    'menu_item_id' => $menuItemId,
                    'menu_date' => $menuDate,
                ],
                [
                    'units_set' => $meal['units_today'],
                    'units_sold' => 0,
                    'units_leftover' => $meal['units_today'],
                ]
            );
        }
    }

    /**
     * Load this date's catalog + daily stock into menuItemNamesPrices, unitsSetPerItem, and reset reserved/sold for the day.
     */
    private function loadMenuForDate(Carbon $date): void
    {
        $this->menuItemNamesPrices = [];
        $this->unitsSetPerItem = [];
        $this->reservedPerItemToday = [];
        $this->soldPerItemToday = [];

        $catalogIds = array_values($this->catalogIdsByName);
        if ($catalogIds === []) {
            return;
        }

        $defsByName = collect($this->getMealDefinitions())->keyBy('name');
        $stockByItemId = MenuItemDailyStock::query()
            ->whereDate('menu_date', $date)
            ->whereIn('menu_item_id', $catalogIds)
            ->get()
            ->keyBy('menu_item_id');

        $items = MenuItem::query()->whereIn('id', $catalogIds)->get()->keyBy('id');

        foreach ($this->catalogIdsByName as $name => $id) {
            $meal = $defsByName->get($name);
            if ($meal === null) {
                continue;
            }
            $item = $items->get($id);
            $stock = $stockByItemId->get($id);
            $set = $stock !== null ? (int) $stock->units_set : (int) $meal['units_today'];

            $this->menuItemNamesPrices[$id] = [
                'name' => $name,
                'price' => $item !== null ? (float) $item->price : (float) $meal['price'],
            ];
            $this->unitsSetPerItem[$id] = $set;
            $this->reservedPerItemToday[$id] = 0;
            $this->soldPerItemToday[$id] = 0;
        }
    }

    public function run(): void
    {
        $this->loadDependencies();
        $today = Carbon::today(config('app.timezone'));

        $this->command->info('Ensuring catalog (one menu_items row per dish) and per-day stock...');
        $this->ensureCatalog();
        $this->ensureStockForDate($today);
        for ($day = 0; $day < self::DAYS_BACK; $day++) {
            $date = $today->copy()->subDays(self::DAYS_BACK - $day)->startOfDay();
            $this->ensureStockForDate($date);
        }

        $approxOrders = (self::DAYS_BACK + 1) * (int) ((self::ORDERS_PER_DAY_MIN + self::ORDERS_PER_DAY_MAX) / 2);
        $this->command->info(
            "Seeding orders, order items, and action logs per day (~{$approxOrders} orders; no output until done unless progress below — may take several minutes in Docker)..."
        );
        $orderCount = 0;
        $activeCountToday = 0;
        $dummyRef = 0;
        $progressEvery = 1000;

        for ($day = 0; $day <= self::DAYS_BACK; $day++) {
            $date = $today->copy()->subDays(self::DAYS_BACK - $day)->startOfDay();
            $this->loadMenuForDate($date);
            if ($this->menuItemNamesPrices === []) {
                continue;
            }
            $ordersPerDay = $this->ordersCountForDay($day);
            for ($i = 0; $i < $ordersPerDay; $i++) {
                $activeRef = $date->isToday() ? $activeCountToday : $dummyRef;
                $this->createOrderWithItemsAndLogs($date, $activeRef);
                $orderCount++;
                if ($this->command !== null && $orderCount % $progressEvery === 0) {
                    $this->command->info("  ... {$orderCount} orders created so far");
                }
            }
        }

        $this->syncTodayStockFromSeededOrders();

        $this->command->info("Created {$orderCount} orders with items and action logs.");
    }

    private function loadDependencies(): void
    {
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
     * @param  int  $activeCountToday  Pass by reference when $date is today; use dummy ref otherwise so only today's active count is tracked.
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
        $availablePerItem = [];
        foreach ($this->unitsSetPerItem as $id => $set) {
            $res = $this->reservedPerItemToday[$id] ?? 0;
            $sold = $this->soldPerItemToday[$id] ?? 0;
            $availablePerItem[$id] = max(0, $set - $res - $sold);
        }
        $itemRows = $this->randomOrderItems($availablePerItem);
        if ($itemRows === [] || array_sum(array_column($itemRows, 'quantity')) === 0) {
            if ($this->isActiveStatus($status) && $date->isToday()) {
                $activeCountToday = max(0, $activeCountToday - 1);
            }

            return;
        }
        // Cap each line to current available so DB never exceeds set per item (defensive)
        foreach ($itemRows as &$row) {
            $id = $row['menu_item_id'] ?? null;
            if ($id !== null && isset($availablePerItem[$id])) {
                $row['quantity'] = min($row['quantity'], $availablePerItem[$id]);
                $row['subtotal'] = $row['price'] * $row['quantity'];
            }
        }
        unset($row);
        $itemRows = array_values(array_filter($itemRows, fn ($r) => ($r['quantity'] ?? 0) > 0));
        if ($itemRows === [] || array_sum(array_column($itemRows, 'quantity')) === 0) {
            if ($this->isActiveStatus($status) && $date->isToday()) {
                $activeCountToday = max(0, $activeCountToday - 1);
            }

            return;
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
            if ($row['menu_item_id']) {
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
            return $this->randomCompletedOrCancelled();
        }

        return $this->resolveStatusForToday($activeCountToday);
    }

    /**
     * Today only: 90% done (completed/cancelled), 10% active; cap active count at MAX_ACTIVE_ORDERS_TODAY.
     */
    private function resolveStatusForToday(int &$activeCountToday): string
    {
        if ($this->randomBool(0.9) || $activeCountToday >= self::MAX_ACTIVE_ORDERS_TODAY) {
            return $this->randomCompletedOrCancelled();
        }
        $activeStatuses = [
            OrderStatus::Received->value,
            OrderStatus::Preparing->value,
            OrderStatus::Ready->value,
            OrderStatus::OnTheWay->value,
        ];
        $activeCountToday++;

        return $activeStatuses[array_rand($activeStatuses)];
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
        return '+63'.(string) random_int(9000000000, 9999999999);
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
     * Sync menu_item_daily_stock and menu_items.units_today for today so the app's
     * display is consistent: units_today = set - sold - reserved.
     * Recomputes sold/reserved from DB for today's menu items so today's menu is never left empty or out of sync.
     */
    private function syncTodayStockFromSeededOrders(): void
    {
        $today = Carbon::today(config('app.timezone'));
        $menuDate = $today->toDateString();
        $pendingStatuses = [
            OrderStatus::Received->value,
            OrderStatus::Preparing->value,
            OrderStatus::Ready->value,
            OrderStatus::OnTheWay->value,
        ];

        $todayItemIds = array_values($this->catalogIdsByName);
        if ($todayItemIds === []) {
            $this->command->warn('No catalog menu items; ensuring catalog + today stock.');
            $this->ensureCatalog();
            $this->ensureStockForDate($today);
            $todayItemIds = array_values($this->catalogIdsByName);
        }

        $stockRows = MenuItemDailyStock::query()
            ->whereIn('menu_item_id', $todayItemIds)
            ->whereDate('menu_date', $today)
            ->get()
            ->keyBy('menu_item_id');

        $soldByItem = OrderItem::query()
            ->whereIn('menu_item_id', $todayItemIds)
            ->whereHas('order', fn ($q) => $q->whereDate('created_at', $today)
                ->whereIn('status', [OrderStatus::Completed->value, OrderStatus::Cancelled->value]))
            ->selectRaw('menu_item_id, COALESCE(SUM(quantity), 0) as qty')
            ->groupBy('menu_item_id')
            ->pluck('qty', 'menu_item_id')
            ->all();

        $reservedByItem = OrderItem::query()
            ->whereIn('menu_item_id', $todayItemIds)
            ->whereHas('order', fn ($q) => $q->whereDate('created_at', $today)->whereIn('status', $pendingStatuses))
            ->selectRaw('menu_item_id, COALESCE(SUM(quantity), 0) as qty')
            ->groupBy('menu_item_id')
            ->pluck('qty', 'menu_item_id')
            ->all();

        $defaultSetByName = collect($this->getMealDefinitions())->pluck('units_today', 'name')->all();
        $items = MenuItem::query()->whereIn('id', $todayItemIds)->get()->keyBy('id');

        $minQtyBuffer = 10; // Ensure today's menu always shows quantity > current orders

        foreach ($todayItemIds as $menuItemId) {
            $item = $items->get($menuItemId);
            $stock = $stockRows->get($menuItemId);
            $set = $stock ? (int) $stock->units_set : (int) ($defaultSetByName[$item->name ?? ''] ?? $item->units_today ?? 0);
            if ($set <= 0 && $item) {
                $set = (int) ($defaultSetByName[$item->name ?? ''] ?? 30);
            }
            $sold = (int) ($soldByItem[$menuItemId] ?? 0);
            $reserved = (int) ($reservedByItem[$menuItemId] ?? 0);
            $leftover = max(0, $set - $sold - $reserved);

            // At end of seeding: ensure today's Qty is always > current orders (never 0)
            $minLeftover = max($reserved + $minQtyBuffer, $minQtyBuffer);
            if ($leftover < $minLeftover) {
                $leftover = $minLeftover;
                $set = $leftover + $sold + $reserved;
            }

            MenuItemDailyStock::updateOrCreate(
                [
                    'menu_item_id' => $menuItemId,
                    'menu_date' => $menuDate,
                ],
                [
                    'units_set' => $set,
                    'units_sold' => $sold,
                    'units_leftover' => $leftover,
                ]
            );
            MenuItem::query()
                ->where('id', $menuItemId)
                ->update([
                    'units_today' => $leftover,
                    'menu_date' => $menuDate,
                ]);
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
