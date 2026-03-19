<?php

namespace App\Services;

use App\Models\DeliveryArea;
use App\Models\MenuItem;
use App\Services\MenuItemStockService;
use Carbon\Carbon;

class MenuDataService
{
    /**
     * Load today's menu items together with the virtual available counts used for slot checks.
     *
     * @return array{menu_items: array<int, array{id: int, name: string, price: float, category?: string, available: int}>, virtual_available: array<int, int>}
     */
    public function loadMenuItemsWithVirtualAvailable(): array
    {
        $today = Carbon::today();
        $todayMenuItems = MenuItem::query()
            ->with('category')
            ->whereDate('menu_items.menu_date', $today)
            ->join('categories', 'menu_items.category_id', '=', 'categories.id')
            ->select('menu_items.*')
            ->orderBy('categories.sort_order')
            ->orderBy('categories.name')
            ->orderBy('menu_items.name')
            ->get();

        $virtualAvailable = app(MenuItemStockService::class)->getVirtualAvailableForToday($todayMenuItems->pluck('id')->all());

        $menuItems = $todayMenuItems
            ->sort(function ($a, $b) {
                $orderA = $a->category?->sort_order ?? 999;
                $orderB = $b->category?->sort_order ?? 999;
                if ($orderA !== $orderB) {
                    return $orderA <=> $orderB;
                }
                $nameA = $a->category?->name ?? '';
                $nameB = $b->category?->name ?? '';
                if ($nameA !== $nameB) {
                    return strcmp($nameA, $nameB);
                }
                return strcmp($a->name, $b->name);
            })
            ->values()
            ->map(function ($m) use ($virtualAvailable) {
                $available = (int) ($virtualAvailable[$m->id] ?? 0);

                return [
                    'id' => $m->id,
                    'name' => $m->name,
                    'price' => (float) $m->price,
                    'category' => $m->category?->name ?? '',
                    'available' => $available,
                ];
            })
            // Chatbot/menu states only present items that are actually available today.
            ->filter(fn (array $m) => $m['available'] > 0)
            ->all();

        return [
            'menu_items' => $menuItems,
            'virtual_available' => $virtualAvailable,
        ];
    }

    /**
     * Load today's menu items without exposing the virtual availability map.
     *
     * @return array<int, array{id: int, name: string, price: float, category?: string, available: int}>
     */
    public function loadMenuItems(): array
    {
        $result = $this->loadMenuItemsWithVirtualAvailable();

        return $result['menu_items'];
    }

    /**
     * @return array<int, array{id: int, name: string, is_free: bool, fee: float|null}>
     */
    public function loadDeliveryAreas(): array
    {
        return DeliveryArea::query()
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'name' => $a->name,
                'is_free' => (bool) $a->is_free,
                'fee' => $a->fee !== null ? (float) $a->fee : null,
            ])
            ->values()
            ->all();
    }
}

