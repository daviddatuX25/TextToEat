<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreMenuItemRequest;
use App\Http\Requests\UpdateMenuItemRequest;
use App\Models\MenuItem;
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

        $virtualAvailable = $this->stockService->getVirtualAvailableForToday(
            $menuItems->pluck('id')->all()
        );

        $menuItems = $menuItems->through(function ($item) use ($virtualAvailable) {
            $arr = $item->toArray();
            $arr['virtual_available'] = $virtualAvailable[$item->id] ?? (int) $item->units_today;

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

        MenuItem::create($validated);

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
