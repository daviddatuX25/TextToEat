<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreMenuItemRequest;
use App\Http\Requests\UpdateMenuItemRequest;
use App\Models\Category;
use App\Models\MenuItem;
use App\Models\MenuItemDailyStock;
use App\Models\Setting;
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
            'category' => ['nullable', 'integer', 'exists:categories,id'],
        ]);
        $today = Carbon::today();
        $menuItems = MenuItem::query()
            ->with('category')
            ->when(
                ! empty($validated['category']),
                fn ($q) => $q->where('category_id', $validated['category'])
            )
            ->join('categories', 'menu_items.category_id', '=', 'categories.id')
            ->select('menu_items.*')
            ->orderBy('categories.sort_order')
            ->orderBy('categories.name')
            ->orderBy('menu_items.name')
            ->paginate(20)
            ->withQueryString();

        $ids = $menuItems->pluck('id')->all();
        $virtualAvailable = $this->stockService->getVirtualAvailableForToday($ids);
        $currentOrders = $this->stockService->getReservedForToday($ids);

        $stockByItem = MenuItemDailyStock::query()
            ->whereIn('menu_item_id', $ids)
            ->whereDate('menu_date', $today)
            ->get()
            ->keyBy('menu_item_id');

        $menuItems = $menuItems->through(function ($item) use ($virtualAvailable, $currentOrders, $stockByItem) {
            $item->load('category');
            $arr = $item->toArray();
            $arr['category'] = $item->category?->name;
            $arr['virtual_available'] = $virtualAvailable[$item->id] ?? 0;
            $arr['current_orders'] = $currentOrders[$item->id] ?? 0;

            $stock = $stockByItem->get($item->id);
            $arr['units_today'] = $stock ? (int) $stock->units_leftover : 0;

            return $arr;
        });

        $categories = Category::query()
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name', 'sort_order'])
            ->map(fn (Category $c) => ['id' => $c->id, 'name' => $c->name, 'sort_order' => $c->sort_order])
            ->all();

        $menuCategories = MenuItem::query()
            ->with('category')
            ->get()
            ->pluck('category.name')
            ->filter()
            ->unique()
            ->sort()
            ->values()
            ->all();

        $totalMenuItems = MenuItem::query()->count();
        $threshold = (int) Setting::get('menu.low_stock_threshold', 5);
        $lowStockCount = $this->stockService->countLowStockOnTodaysMenu($threshold);

        return Inertia::render('MenuItems', [
            'menuItems' => $menuItems,
            'categories' => $categories,
            'menuCategories' => $menuCategories,
            'filterCategory' => $validated['category'] ?? null,
            'totalMenuItems' => $totalMenuItems,
            'lowStockCount' => $lowStockCount,
            'lowStockThreshold' => $threshold,
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
            $today = Carbon::today();
            $stock = MenuItemDailyStock::query()
                ->where('menu_item_id', $menuItem->id)
                ->whereDate('menu_date', $today)
                ->first();
            if ($stock) {
                $stock->update([
                    'units_set' => $set,
                    'units_leftover' => max(0, $set - (int) $stock->units_sold),
                ]);
            } else {
                MenuItemDailyStock::create([
                    'menu_item_id' => $menuItem->id,
                    'menu_date' => $today,
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
        $menuItem->delete();

        return redirect()->back()->with('success', 'Menu item removed.');
    }
}
