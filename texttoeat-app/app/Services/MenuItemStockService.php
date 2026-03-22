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
     * Availability is per day, keyed by (menu_item_id, menu_date = today).
     *
     * @param  array<int, int>  $menuItemIds  Optional. If empty, compute for all today's menu items.
     * @param  bool  $persistMissingDailyStock  When true (default), missing rows are created from legacy units_today.
     * @return array<int, int> Map of menu_item_id => virtual_available (>= 0)
     */
    public function getVirtualAvailableForToday(array $menuItemIds = [], bool $persistMissingDailyStock = true): array
    {
        $today = Carbon::today();
        $stockQuery = MenuItemDailyStock::query()
            ->whereDate('menu_date', $today);

        if ($menuItemIds !== []) {
            $stockQuery->whereIn('menu_item_id', $menuItemIds);
        }

        $stockByItem = $stockQuery
            ->get()
            ->keyBy('menu_item_id');

        // Transitional fallback: if some requested items do not yet have a stock row,
        // seed stock from the legacy units_today field on MenuItem so we don't break
        // existing flows that still edit units_today.
        if ($menuItemIds !== []) {
            $missingIds = array_values(array_diff($menuItemIds, $stockByItem->keys()->all()));
            if ($missingIds !== []) {
                $fallbackItems = MenuItem::query()
                    ->whereIn('id', $missingIds)
                    ->get(['id', 'units_today']);

                foreach ($fallbackItems as $item) {
                    if ($persistMissingDailyStock) {
                        $stock = MenuItemDailyStock::firstOrCreate(
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
                    } else {
                        $stock = new MenuItemDailyStock([
                            'menu_item_id' => $item->id,
                            'menu_date' => $today,
                            'units_set' => (int) $item->units_today,
                            'units_sold' => 0,
                            'units_leftover' => (int) $item->units_today,
                        ]);
                    }
                    $stockByItem->put($item->id, $stock);
                }
            }
        }

        $pendingStatuses = [
            OrderStatus::Received->value,
            OrderStatus::Preparing->value,
            OrderStatus::Ready->value,
            OrderStatus::OnTheWay->value,
        ];

        $ids = $stockByItem->keys()->all();
        if ($ids === []) {
            return [];
        }

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
        foreach ($stockByItem as $menuItemId => $stock) {
            $set = (int) $stock->units_set;
            $sold = (int) $stock->units_sold;
            $res = (int) ($reserved[$menuItemId] ?? 0);
            $result[$menuItemId] = max(0, $set - $res - $sold);
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
     * Meals on today's menu (menu_date = today) that are not sold out and have virtual
     * available strictly below the threshold. Uses menu_item_daily_stock + reservations,
     * scoped to one catalog row per dish for today — not every historical menu_items row.
     */
    public function countLowStockOnTodaysMenu(int $threshold): int
    {
        $today = Carbon::today();
        $ids = MenuItem::query()
            ->whereDate('menu_date', $today)
            ->where('is_sold_out', false)
            ->orderBy('id')
            ->pluck('id')
            ->all();

        if ($ids === []) {
            return 0;
        }

        $virtual = $this->getVirtualAvailableForToday($ids, false);
        $n = 0;
        foreach ($ids as $id) {
            $v = (int) ($virtual[$id] ?? 0);
            if ($v < $threshold) {
                $n++;
            }
        }

        return $n;
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
        if ($menuItemIds === []) {
            $ids = MenuItemDailyStock::query()
                ->whereDate('menu_date', $today)
                ->pluck('menu_item_id')
                ->unique()
                ->all();
        } else {
            $ids = $menuItemIds;
        }

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
