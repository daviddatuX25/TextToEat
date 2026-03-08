<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Models\MenuItem;
use App\Models\MenuItemDailyStock;
use App\Models\OrderItem;
use Carbon\Carbon;

class MenuItemStockService
{
    /**
     * Virtual available (on the line) = units_set minus reserved (pending orders) minus units_sold.
     * Reads from menu_item_daily_stock; reserves computed from OrderItem.
     * Only includes menu items where menu_date equals the app's current date (today); previous days are excluded.
     *
     * @param  array<int, int>  $menuItemIds  Optional. If empty, compute for all today's menu items.
     * @return array<int, int> Map of menu_item_id => virtual_available (>= 0)
     */
    public function getVirtualAvailableForToday(array $menuItemIds = []): array
    {
        $today = Carbon::today();
        $query = MenuItem::query()
            ->whereDate('menu_date', $today)
            ->select('id', 'units_today');

        if ($menuItemIds !== []) {
            $query->whereIn('id', $menuItemIds);
        }

        $items = $query->get();
        if ($items->isEmpty()) {
            return [];
        }

        $ids = $items->pluck('id')->all();

        // Ensure daily_stock row exists for each (fallback: use menu_items.units_today for set)
        foreach ($items as $item) {
            MenuItemDailyStock::firstOrCreate(
                [
                    'menu_item_id' => $item->id,
                    'menu_date' => $today,
                ],
                [
                    'units_set' => (int) $item->units_today,
                    'units_sold' => 0,
                    'units_leftover' => (int) $item->units_today,
                ]
            );
        }

        $stockByItem = MenuItemDailyStock::query()
            ->whereIn('menu_item_id', $ids)
            ->whereDate('menu_date', $today)
            ->get()
            ->keyBy('menu_item_id');

        $pendingStatuses = [
            OrderStatus::Received->value,
            OrderStatus::Preparing->value,
            OrderStatus::Ready->value,
            OrderStatus::OnTheWay->value,
        ];

        $reserved = OrderItem::query()
            ->whereIn('menu_item_id', $ids)
            ->whereHas('order', function ($q) use ($pendingStatuses, $today): void {
                $q->whereIn('status', $pendingStatuses)
                    ->whereDate('created_at', $today);
            })
            ->groupBy('menu_item_id')
            ->selectRaw('menu_item_id, COALESCE(SUM(quantity), 0) as reserved')
            ->pluck('reserved', 'menu_item_id')
            ->all();

        $result = [];
        foreach ($items as $item) {
            $stock = $stockByItem->get($item->id);
            $set = $stock ? (int) $stock->units_set : (int) $item->units_today;
            $sold = $stock ? (int) $stock->units_sold : 0;
            $res = (int) ($reserved[$item->id] ?? 0);
            $result[$item->id] = max(0, $set - $res - $sold);
        }

        return $result;
    }

    /**
     * Virtual available for all menu items on today's menu.
     *
     * @return array<int, int> Map of menu_item_id => virtual_available (>= 0)
     */
    public function getVirtualAvailableForTodayAll(): array
    {
        return $this->getVirtualAvailableForToday([]);
    }

    /**
     * Reserved quantity = sum of order_items for pending orders (ongoing, not completed/cancelled)
     * during today.
     *
     * @param  array<int, int>  $menuItemIds  Optional. If empty, compute for all today's menu items.
     * @return array<int, int> Map of menu_item_id => reserved quantity (>= 0)
     */
    public function getReservedForToday(array $menuItemIds = []): array
    {
        $today = Carbon::today();
        $query = MenuItem::query()
            ->whereDate('menu_date', $today)
            ->select('id');

        if ($menuItemIds !== []) {
            $query->whereIn('id', $menuItemIds);
        }

        $ids = $query->pluck('id')->all();
        if ($ids === []) {
            return [];
        }

        $pendingStatuses = [
            OrderStatus::Received->value,
            OrderStatus::Preparing->value,
            OrderStatus::Ready->value,
            OrderStatus::OnTheWay->value,
        ];

        return OrderItem::query()
            ->whereIn('menu_item_id', $ids)
            ->whereHas('order', function ($q) use ($pendingStatuses, $today): void {
                $q->whereIn('status', $pendingStatuses)
                    ->whereDate('created_at', $today);
            })
            ->groupBy('menu_item_id')
            ->selectRaw('menu_item_id, COALESCE(SUM(quantity), 0) as reserved')
            ->pluck('reserved', 'menu_item_id')
            ->map(fn ($v) => (int) $v)
            ->all();
    }
}
