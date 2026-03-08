<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    /**
     * List categories (active only) for the menu category page.
     */
    public function index(): Response
    {
        $categories = Category::query()
            ->withCount('menuItems')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn (Category $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'sort_order' => $c->sort_order,
                'menu_items_count' => $c->menu_items_count,
            ]);

        return Inertia::render('Categories', [
            'categories' => $categories,
        ]);
    }

    /**
     * Store a new category.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        Category::create([
            'name' => $validated['name'],
            'sort_order' => $validated['sort_order'] ?? null,
        ]);

        return redirect()->route('portal.categories')->with('success', 'Category added.');
    }

    /**
     * Update a category.
     */
    public function update(Request $request, Category $category): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $category->update([
            'name' => $validated['name'],
            'sort_order' => $validated['sort_order'] ?? null,
        ]);

        return redirect()->route('portal.categories')->with('success', 'Category updated.');
    }

    /**
     * Soft delete a category (so existing orders/menu items keep reference).
     */
    public function destroy(Category $category): RedirectResponse
    {
        $category->delete();

        return redirect()->route('portal.categories')->with('success', 'Category removed. It is hidden from new menu items but existing data is preserved.');
    }
}
