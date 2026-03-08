<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Models\MenuItem;
use App\Models\OrderItem;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class MenuItemStockService
{
    /**
     * Virtual available = units_today minus quantity reserved by pending orders
     * (orders with status not in completed, cancelled).
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
        $pendingStatuses = [
            OrderStatus::Received->value,
            OrderStatus::Confirmed->value,
            OrderStatus::Ready->value,
            OrderStatus::OnTheWay->value,
        ];

        $reserved = OrderItem::query()
            ->whereIn('menu_item_id', $ids)
            ->whereHas('order', function ($q) use ($pendingStatuses): void {
                $q->whereIn('status', $pendingStatuses);
            })
            ->groupBy('menu_item_id')
            ->selectRaw('menu_item_id, COALESCE(SUM(quantity), 0) as reserved')
            ->pluck('reserved', 'menu_item_id')
            ->all();

        $result = [];
        foreach ($items as $item) {
            $res = (int) ($reserved[$item->id] ?? 0);
            $result[$item->id] = max(0, (int) $item->units_today - $res);
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
}
