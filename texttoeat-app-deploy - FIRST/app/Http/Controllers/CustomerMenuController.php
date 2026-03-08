<?php

namespace App\Http\Controllers;

use App\Models\MenuItem;
use App\Services\MenuItemStockService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CustomerMenuController extends Controller
{
    public function __construct(
        private MenuItemStockService $stockService
    ) {}

    public function index(): Response
    {
        $today = Carbon::today();
        $menuItems = MenuItem::query()
            ->whereDate('menu_date', $today)
            ->orderBy('category')
            ->orderBy('name')
            ->get();

        $virtualAvailable = $this->stockService->getVirtualAvailableForTodayAll();
        $menuItemsArray = $menuItems->map(function ($item) use ($virtualAvailable) {
            $arr = $item->toArray();
            $arr['available'] = $virtualAvailable[$item->id] ?? (int) $item->units_today;
            return $arr;
        })->values()->all();

        $cart = session('customer_cart', []);

        return Inertia::render('Menu', [
            'menuItems' => $menuItemsArray,
            'cart' => $cart,
        ]);
    }

    public function addToCart(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'menu_item_id' => ['required', 'integer', 'exists:menu_items,id'],
            'quantity' => ['required', 'integer', 'min:1'],
        ]);

        $menuItem = MenuItem::findOrFail($validated['menu_item_id']);
        $today = Carbon::today();

        if (! $menuItem->menu_date->isSameDay($today)) {
            return redirect()->route('menu')->with('error', 'Item is not on today\'s menu.');
        }

        if ($menuItem->is_sold_out || (int) $menuItem->units_today <= 0) {
            return redirect()->route('menu')->with('error', 'Item is sold out.');
        }

        $cart = session('customer_cart', []);
        $found = false;
        foreach ($cart as $i => $line) {
            if ((int) $line['menu_item_id'] === (int) $menuItem->id) {
                $cart[$i]['quantity'] = $line['quantity'] + $validated['quantity'];
                $found = true;
                break;
            }
        }
        if (! $found) {
            $cart[] = [
                'menu_item_id' => $menuItem->id,
                'name' => $menuItem->name,
                'price' => (string) $menuItem->price,
                'quantity' => $validated['quantity'],
            ];
        }

        session(['customer_cart' => $cart]);

        return redirect()->route('menu')->with('success', 'Added to cart.');
    }

    public function updateCart(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'menu_item_id' => ['required', 'integer'],
            'quantity' => ['required', 'integer', 'min:0'],
        ]);

        $menuItemId = (int) $validated['menu_item_id'];
        $cart = session('customer_cart', []);
        $newCart = [];
        foreach ($cart as $line) {
            if ((int) $line['menu_item_id'] === $menuItemId) {
                if ($validated['quantity'] > 0) {
                    $newCart[] = array_merge($line, ['quantity' => $validated['quantity']]);
                }
            } else {
                $newCart[] = $line;
            }
        }
        session(['customer_cart' => $newCart]);

        return redirect()->route('menu')->with('success', 'Cart updated.');
    }

    public function removeFromCart(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'menu_item_id' => ['required', 'integer'],
        ]);

        $cart = session('customer_cart', []);
        $newCart = array_values(array_filter($cart, function ($line) use ($validated) {
            return (int) $line['menu_item_id'] !== (int) $validated['menu_item_id'];
        }));
        session(['customer_cart' => $newCart]);

        return redirect()->route('menu')->with('success', 'Item removed from cart.');
    }
}
