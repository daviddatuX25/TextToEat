<?php

namespace App\Http\Controllers;

use App\Models\MenuItem;
use App\Models\Setting;
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

    public function index(): Response|RedirectResponse
    {
        if (! Setting::get('channels.web_enabled', true)) {
            return redirect()->route('web-unavailable');
        }
        $today = Carbon::today();
        $menuItems = MenuItem::query()
            ->with('category')
            ->whereDate('menu_items.menu_date', $today)
            ->join('categories', 'menu_items.category_id', '=', 'categories.id')
            ->select('menu_items.*')
            ->orderBy('categories.sort_order')
            ->orderBy('categories.name')
            ->orderBy('menu_items.name')
            ->get();

        $virtualAvailable = $this->stockService->getVirtualAvailableForTodayAll();
        $menuItemsArray = $menuItems->map(function ($item) use ($virtualAvailable) {
            $item->load('category');
            $arr = $item->toArray();
            $arr['category'] = $item->category?->name ?? '';
            $arr['available'] = $virtualAvailable[$item->id] ?? 0;
            return $arr;
        })
            // Customers should only see items that are actually available today.
            ->filter(fn ($arr) => (int) ($arr['available'] ?? 0) > 0)
            ->values()
            ->all();

        $cart = session('customer_cart', []);

        return Inertia::render('Menu', [
            'menuItems' => $menuItemsArray,
            'cart' => $cart,
        ]);
    }

    public function addToCart(Request $request): RedirectResponse
    {
        if (! Setting::get('channels.web_enabled', true)) {
            return redirect()->route('web-unavailable');
        }

        $validated = $request->validate([
            'menu_item_id' => ['required', 'integer', 'exists:menu_items,id'],
            'quantity' => ['required', 'integer', 'min:1'],
        ]);

        $today = Carbon::today();
        $menuItem = MenuItem::with('category')->findOrFail($validated['menu_item_id']);

        // Enforce inventory based on per-day stock/virtual availability for today.
        $availableMap = $this->stockService->getVirtualAvailableForToday([$menuItem->id]);
        $available = (int) ($availableMap[$menuItem->id] ?? 0);
        if ($available <= 0) {
            return redirect()->route('menu')->with('error', 'Item is sold out.');
        }
        if ($validated['quantity'] > $available) {
            return redirect()->route('menu')->with('error', 'Not enough stock available for this item.');
        }

        $cart = session('customer_cart', []);
        $found = false;
        foreach ($cart as $i => $line) {
            if ((int) $line['menu_item_id'] === (int) $menuItem->id) {
                $cart[$i]['quantity'] = $line['quantity'] + $validated['quantity'];
                if (! isset($cart[$i]['category'])) {
                    $cart[$i]['category'] = $menuItem->category?->name ?? '';
                }
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
                'category' => $menuItem->category?->name ?? '',
            ];
        }

        session(['customer_cart' => $cart]);

        return redirect()->route('menu')->with('success', 'Added to cart.');
    }

    public function updateCart(Request $request): RedirectResponse
    {
        if (! Setting::get('channels.web_enabled', true)) {
            return redirect()->route('web-unavailable');
        }

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
        if (! Setting::get('channels.web_enabled', true)) {
            return redirect()->route('web-unavailable');
        }

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
