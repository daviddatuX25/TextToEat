<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreMenuItemRequest;
use App\Http\Requests\UpdateMenuItemRequest;
use App\Models\MenuItem;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class MenuItemsController extends Controller
{
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
        ]);
    }

    public function store(StoreMenuItemRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $validated['menu_date'] = Carbon::today();
        $validated['is_sold_out'] = false;

        MenuItem::create($validated);

        return redirect()->back()->with('success', 'Menu item added.');
    }

    public function update(UpdateMenuItemRequest $request, MenuItem $menuItem): RedirectResponse
    {
        if (! $menuItem->menu_date->isToday()) {
            abort(404);
        }

        $menuItem->update($request->validated());

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
