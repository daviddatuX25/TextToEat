<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreMenuItemRequest;
use App\Http\Requests\UpdateMenuItemRequest;
use App\Models\MenuItem;
use App\Models\MenuItemDailyStock;
use App\Services\MenuItemImageService;
use App\Services\MenuItemStockService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MenuItemsController extends Controller
{
    public function __construct(
        private MenuItemImageService $imageService,
        private MenuItemStockService $stockService
    ) {}

    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'category' => ['nullable', 'string', 'max:255'],
        ]);

        $today = Carbon::today();
        $menuItems = MenuItem::query()
            ->whereDate('menu_date', $today)
            ->when(
                ! empty($validated['category']),
                fn ($q) => $q->where('category', $validated['category'])
            )
            ->orderBy('category')
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString();

        $ids = $menuItems->pluck('id')->all();
        $virtualAvailable = $this->stockService->getVirtualAvailableForToday($ids);
        $currentOrders = $this->stockService->getReservedForToday($ids);

        $menuItems = $menuItems->through(function ($item) use ($virtualAvailable, $currentOrders) {
            $arr = $item->toArray();
            $arr['virtual_available'] = $virtualAvailable[$item->id] ?? (int) $item->units_today;
            $arr['current_orders'] = $currentOrders[$item->id] ?? 0;

            return $arr;
        });

        $menuCategories = MenuItem::query()
            ->whereDate('menu_date', $today)
            ->distinct()
            ->pluck('category')
            ->filter()
            ->sort()
            ->values()
            ->all();

        return Inertia::render('MenuItems', [
            'menuItems' => $menuItems,
            'categories' => config('menu.categories', []),
            'menuCategories' => $menuCategories,
            'filterCategory' => $validated['category'] ?? null,
        ]);
    }

    public function store(StoreMenuItemRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        unset($validated['image']);
        $validated['menu_date'] = Carbon::today();
        $validated['is_sold_out'] = false;

        if ($request->hasFile('image')) {
            $url = $this->imageService->processUpload($request->file('image'));
            if ($url) {
                $validated['image_url'] = $url;
            }
        }

        $menuItem = MenuItem::create($validated);

        MenuItemDailyStock::create([
            'menu_item_id' => $menuItem->id,
            'menu_date' => $menuItem->menu_date,
            'units_set' => (int) ($validated['units_today'] ?? 0),
            'units_sold' => 0,
            'units_leftover' => (int) ($validated['units_today'] ?? 0),
        ]);

        return redirect()->back()->with('success', 'Menu item added.');
    }

    public function update(UpdateMenuItemRequest $request, MenuItem $menuItem): RedirectResponse
    {
        if (! $menuItem->menu_date->isToday()) {
            abort(404);
        }

        $validated = $request->validated();
        unset($validated['image'], $validated['remove_image']);

        if ($request->boolean('remove_image') || $request->hasFile('image')) {
            if ($menuItem->image_url) {
                $this->imageService->deleteByUrl($menuItem->image_url);
                $validated['image_url'] = null;
            }
        }

        if ($request->hasFile('image')) {
            $url = $this->imageService->processUpload($request->file('image'));
            if ($url) {
                $validated['image_url'] = $url;
            }
        }

        $menuItem->update($validated);

        if (array_key_exists('units_today', $validated)) {
            $set = (int) $validated['units_today'];
            $stock = MenuItemDailyStock::query()
                ->where('menu_item_id', $menuItem->id)
                ->whereDate('menu_date', $menuItem->menu_date)
                ->first();
            if ($stock) {
                $stock->update([
                    'units_set' => $set,
                    'units_leftover' => max(0, $set - (int) $stock->units_sold),
                ]);
            } else {
                MenuItemDailyStock::create([
                    'menu_item_id' => $menuItem->id,
                    'menu_date' => $menuItem->menu_date,
                    'units_set' => $set,
                    'units_sold' => 0,
                    'units_leftover' => $set,
                ]);
            }
        }

        return redirect()->back()->with('success', 'Menu item updated.');
    }

    public function destroy(MenuItem $menuItem): RedirectResponse
    {
        if (! $menuItem->menu_date->isToday()) {
            abort(404);
        }

        $menuItem->delete();
        return redirect()->back()->with('success', 'Menu item removed.');
    }
}
