<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreMenuItemRequest;
use App\Http\Requests\UpdateMenuItemRequest;
use App\Models\MenuItem;
use App\Services\MenuItemImageService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class MenuItemsController extends Controller
{
    public function __construct(
        private MenuItemImageService $imageService
    ) {}

    public function index(): Response
    {
        $today = Carbon::today();
        $menuItems = MenuItem::query()
            ->whereDate('menu_date', $today)
            ->orderBy('category')
            ->orderBy('name')
            ->get();

        return Inertia::render('MenuItems', [
            'menuItems' => $menuItems,
            'categories' => config('menu.categories', []),
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
