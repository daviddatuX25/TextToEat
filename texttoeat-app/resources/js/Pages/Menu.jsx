import { useState, useMemo } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import AppLayout from '../Layouts/AppLayout';
import { Button, Card, Badge } from '../components/ui';
import { Search, Plus, Minus, ShoppingBag, Utensils, ChevronRight } from 'lucide-react';
import { formatCurrency } from '../utils/formatNumber';

const MAX_QUANTITY = 99;

export default function Menu({ menuItems = [], cart = [] }) {
    const { flash } = usePage().props;
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');

    const categories = useMemo(() => {
        const cats = [...new Set(menuItems.map((m) => m.category).filter(Boolean))].sort();
        return ['All', ...cats];
    }, [menuItems]);

    const filteredItems = useMemo(() => {
        const q = search.trim().toLowerCase();
        const byCat = categoryFilter === 'All' || categoryFilter === '';
        return menuItems.filter((item) => {
            const matchesSearch = !q || item.name?.toLowerCase().includes(q) || item.category?.toLowerCase().includes(q);
            const matchesCategory = byCat || item.category === categoryFilter;
            return matchesSearch && matchesCategory;
        });
    }, [menuItems, search, categoryFilter]);

    const cartTotal = useMemo(() => {
        return cart.reduce((sum, line) => sum + parseFloat(line.price || 0) * parseInt(line.quantity || 0, 10), 0);
    }, [cart]);

    const getCartQuantity = (menuItemId) => {
        const line = cart.find((l) => Number(l.menu_item_id) === Number(menuItemId));
        return line ? parseInt(line.quantity, 10) : 0;
    };

    const addToCart = (item, quantity = 1) => {
        if (item.is_sold_out || (item.units_today != null && item.units_today <= 0)) return;
        const qty = Math.min(quantity, item.units_today ?? MAX_QUANTITY, MAX_QUANTITY);
        if (qty < 1) return;
        router.post('/cart/add', { menu_item_id: item.id, quantity: qty });
    };

    const updateCartQty = (menuItemId, quantity) => {
        if (quantity < 1) return;
        router.post('/cart/update', { menu_item_id: menuItemId, quantity });
    };

    const removeFromCart = (menuItemId) => {
        router.post('/cart/remove', { menu_item_id: menuItemId });
    };

    const hasCart = cart.length > 0;

    return (
        <AppLayout showDashboard={false}>
            <section className="flex flex-col gap-8 animate-fade-in">
                {/* Hero */}
                <header className="rounded-2xl border border-surface-200 dark:border-surface-700 bg-gradient-to-br from-surface-50 to-primary-50/30 dark:from-surface-800/80 dark:to-primary-900/20 px-6 py-8 md:px-8 md:py-10">
                    <div className="max-w-3xl">
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-surface-900 dark:text-white">
                            What would you like today?
                        </h1>
                        <p className="mt-2 text-surface-600 dark:text-surface-400">
                            Fresh, home-cooked Filipino favorites. Add items to your cart and proceed to checkout.
                        </p>
                    </div>
                    {/* Search */}
                    <div className="relative mt-6 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-surface-400" />
                        <input
                            type="search"
                            placeholder="Search dishes..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-xl border-2 border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-900 pl-12 pr-4 py-3 text-sm font-medium text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            aria-label="Search menu"
                        />
                    </div>
                    {/* Category pills */}
                    <div className="flex flex-wrap gap-2 mt-4">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setCategoryFilter(cat)}
                                className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                                    categoryFilter === cat
                                        ? 'bg-primary-600 text-white shadow-md'
                                        : 'bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-600 text-surface-700 dark:text-surface-300 hover:border-primary-300 dark:hover:border-primary-600'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </header>

                {flash?.success && (
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 px-4 py-3 text-sm font-medium">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 text-sm font-medium">
                        {flash.error}
                    </div>
                )}

                {/* Menu grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredItems.map((item) => {
                        const available = item.available ?? item.units_today ?? 0;
                        const soldOut = item.is_sold_out || available <= 0;
                        const cartQty = getCartQuantity(item.id);
                        const maxAdd = Math.min(available, MAX_QUANTITY) - cartQty;

                        return (
                            <Card
                                key={item.id}
                                className={`overflow-hidden transition-all ${
                                    soldOut ? 'opacity-60' : 'hover:shadow-lg'
                                }`}
                            >
                                <div className="aspect-[4/3] bg-surface-100 dark:bg-surface-800 relative overflow-hidden">
                                    {item.image_url ? (
                                        <img
                                            src={item.image_url}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Utensils className="h-16 w-16 text-surface-300 dark:text-surface-600" />
                                        </div>
                                    )}
                                    {item.category && (
                                        <Badge variant="premium" className="absolute top-3 left-3">
                                            {item.category}
                                        </Badge>
                                    )}
                                    {soldOut && (
                                        <div className="absolute inset-0 bg-surface-900/50 flex items-center justify-center">
                                            <span className="text-white font-bold text-lg">Sold out</span>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4">
                                    <div className="flex justify-between items-start gap-2">
                                        <h3 className="font-bold text-surface-900 dark:text-surface-100 line-clamp-2">
                                            {item.name}
                                        </h3>
                                        <span className="font-bold text-primary-600 dark:text-primary-400 shrink-0">
                                            {formatCurrency(Number(item.price))}
                                        </span>
                                    </div>
                                    {!soldOut && (
                                        <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                                            Good for {available} order{available !== 1 ? 's' : ''}
                                        </p>
                                    )}

                                    {!soldOut && (
                                        <div className="mt-4 flex items-center gap-2">
                                            {cartQty > 0 ? (
                                                <>
                                                    <div className="flex items-center rounded-lg border-2 border-surface-200 dark:border-surface-600 overflow-hidden">
                                                        <button
                                                            type="button"
                                                            onClick={() => updateCartQty(item.id, cartQty - 1)}
                                                            className="p-2 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800"
                                                            aria-label="Decrease quantity"
                                                        >
                                                            <Minus className="h-4 w-4" />
                                                        </button>
                                                        <span className="min-w-[2rem] text-center text-sm font-bold">
                                                            {cartQty}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                maxAdd > 0 && addToCart(item, cartQty + 1)
                                                            }
                                                            disabled={maxAdd <= 0}
                                                            className="p-2 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-50"
                                                            aria-label="Increase quantity"
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                    {maxAdd <= 0 && (
                                                        <span className="text-xs text-amber-600 dark:text-amber-400">
                                                            Max reached
                                                        </span>
                                                    )}
                                                </>
                                            ) : (
                                                <Button
                                                    type="button"
                                                    variant="primary"
                                                    onClick={() => addToCart(item, 1)}
                                                    className="gap-1.5"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                    Add to cart
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </div>

                {filteredItems.length === 0 && (
                    <div className="rounded-2xl border-2 border-dashed border-surface-200 dark:border-surface-700 p-12 text-center text-surface-500 dark:text-surface-400">
                        No items match your search. Try a different term or category.
                    </div>
                )}
            </section>

            {/* Sticky cart bar */}
            {hasCart && (
                <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-surface-200 dark:border-surface-700 bg-white/95 dark:bg-surface-900/95 backdrop-blur-sm shadow-lg">
                    <div className="mx-auto max-w-7xl px-6 py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/40">
                                <ShoppingBag className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                            </div>
                            <div>
                                <p className="font-bold text-surface-900 dark:text-white">
                                    {cart.reduce((s, l) => s + parseInt(l.quantity, 10), 0)} item(s)
                                </p>
                                <p className="text-sm text-surface-600 dark:text-surface-400">
                                    Total: {formatCurrency(cartTotal)}
                                </p>
                            </div>
                        </div>
                        <Link
                            href="/checkout"
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3 font-bold text-white hover:bg-primary-700 transition-colors"
                        >
                            Proceed to checkout
                            <ChevronRight className="h-5 w-5" />
                        </Link>
                    </div>
                    {/* Cart line summary (optional expand) */}
                    <div className="mx-auto max-w-7xl px-6 pb-3 max-h-32 overflow-y-auto">
                        <ul className="flex flex-wrap gap-2 text-sm">
                            {cart.map((line) => (
                                <li
                                    key={line.menu_item_id}
                                    className="flex items-center gap-2 rounded-lg bg-surface-100 dark:bg-surface-800 px-3 py-1.5"
                                >
                                    <span className="font-medium text-surface-700 dark:text-surface-300">
                                        {line.name} × {line.quantity}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => removeFromCart(line.menu_item_id)}
                                        className="text-surface-400 hover:text-red-600 dark:hover:text-red-400"
                                        aria-label={`Remove ${line.name} from cart`}
                                    >
                                        ×
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Spacer when cart is visible so content isn't hidden */}
            {hasCart && <div className="h-28" />}
        </AppLayout>
    );
}
