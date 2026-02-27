<?php

namespace App\Http\Controllers;

use App\Models\MenuItem;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CustomerMenuController extends Controller
{
    public function index(): Response
    {
        $today = Carbon::today();
        $menuItems = MenuItem::query()
            ->whereDate('menu_date', $today)
            ->orderBy('category')
            ->orderBy('name')
            ->get();

        $cart = session('customer_cart', []);

        return Inertia::render('Menu', [
            'menuItems' => $menuItems,
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
            abort(422, 'Item is not on today\'s menu.');
        }

        if ($menuItem->is_sold_out || $menuItem->units_today <= 0) {
            abort(422, 'Item is sold out.');
        }

        if ($validated['quantity'] > $menuItem->units_today) {
            abort(422, 'Quantity exceeds available units.');
        }

        $cart = session('customer_cart', []);
        $found = false;
        foreach ($cart as $i => $line) {
            if ((int) $line['menu_item_id'] === (int) $menuItem->id) {
                $newQty = $line['quantity'] + $validated['quantity'];
                if ($newQty > $menuItem->units_today) {
                    abort(422, 'Quantity would exceed available units.');
                }
                $cart[$i]['quantity'] = $newQty;
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

        $cart = session('customer_cart', []);
        $newCart = [];
        foreach ($cart as $line) {
            if ((int) $line['menu_item_id'] === (int) $validated['menu_item_id']) {
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
