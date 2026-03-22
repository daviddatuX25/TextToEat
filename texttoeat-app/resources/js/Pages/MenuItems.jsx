import { useState, useEffect, useRef } from 'react';
import { Link, router, useForm } from '@inertiajs/react';
import PortalLayout from '../Layouts/PortalLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { Button, Card, CardContent, Badge, PageHeader } from '../components/ui';
import { Plus, Pencil, Trash2, Minus, ImagePlus, Utensils, Power, PowerOff } from 'lucide-react';
import { formatCurrency } from '../utils/formatNumber';

const ACCEPT_IMAGES = 'image/jpeg,image/png,image/webp';
const r = () => router ?? window.__inertia_router;

function AddMenuItemDialog({ open, onOpenChange, categories = [] }) {
    const form = useForm({
        name: '',
        price: '',
        category_id: categories[0]?.id ?? '',
        units_today: 30,
        image: null,
    });
    const fileInputRef = useRef(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    useEffect(() => {
        if (!open) {
            form.reset();
            setPreviewUrl(null);
        }
    }, [open]);

    useEffect(() => {
        if (form.data.image instanceof File) {
            const url = URL.createObjectURL(form.data.image);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        }
        setPreviewUrl(null);
    }, [form.data.image]);

    const submit = (e) => {
        e.preventDefault();
        const routerImpl = r();
        if (!routerImpl?.post) return;
        routerImpl.post('/portal/menu-items', form.data, {
            forceFormData: true,
            onSuccess: () => {
                form.reset();
                setPreviewUrl(null);
                onOpenChange(false);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Add menu item</DialogTitle>
                    <DialogDescription>Add a new item to today&apos;s menu.</DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    <Input
                        id="add_name"
                        label="Name"
                        type="text"
                        required
                        value={form.data.name}
                        onChange={(e) => form.setData('name', e.target.value)}
                        error={form.errors.name}
                    />
                    <Input
                        id="add_price"
                        label="Price (₱)"
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={form.data.price}
                        onChange={(e) => form.setData('price', e.target.value)}
                        error={form.errors.price}
                    />
                    <div className="space-y-2">
                        <label htmlFor="add_category" className="block text-sm font-bold text-foreground">Category</label>
                        <select
                            id="add_category"
                            value={form.data.category_id}
                            onChange={(e) => form.setData('category_id', e.target.value ? Number(e.target.value) : '')}
                            className="w-full rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2 text-sm bg-white dark:bg-surface-800 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                            required
                        >
                            {(categories || []).map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <Input
                        id="add_units"
                        label="Units today"
                        type="number"
                        min="0"
                        value={form.data.units_today}
                        onChange={(e) => form.setData('units_today', e.target.value)}
                        error={form.errors.units_today}
                    />
                    <div className="space-y-2">
                        <span className="block text-sm font-bold text-foreground">Image</span>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept={ACCEPT_IMAGES}
                            className="hidden"
                            onChange={(e) => form.setData('image', e.target.files?.[0] ?? null)}
                        />
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={() => fileInputRef.current?.click()}
                            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                            className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-800/50 p-4 hover:border-primary/50 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors cursor-pointer"
                        >
                            <ImagePlus className="h-8 w-8 text-surface-400 dark:text-surface-500" />
                            <span className="text-sm font-medium text-surface-600 dark:text-surface-400">
                                {form.data.image instanceof File ? form.data.image.name : 'Choose image'}
                            </span>
                            {previewUrl && (
                                <img src={previewUrl} alt="" className="h-20 w-20 object-cover rounded-lg border border-surface-200 dark:border-surface-600" />
                            )}
                        </div>
                    </div>
                    <DialogFooter className="flex-row justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={form.processing}>Add</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function EditMenuItemDialog({ item, open, onOpenChange, categories = [] }) {
    const form = useForm({
        name: item?.name ?? '',
        category_id: item?.category_id ?? categories[0]?.id ?? '',
        image: null,
        remove_image: false,
    });
    const fileInputRef = useRef(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    useEffect(() => {
        if (!open || !item) return;
        form.setData({
            name: item.name ?? '',
            category_id: item.category_id ?? categories[0]?.id ?? '',
            image: null,
            remove_image: false,
        });
        form.clearErrors();
        setPreviewUrl(null);
    }, [open, item?.id]);

    useEffect(() => {
        if (form.data.remove_image) {
            setPreviewUrl(null);
            return;
        }
        if (form.data.image instanceof File) {
            const url = URL.createObjectURL(form.data.image);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        }
        setPreviewUrl(null);
    }, [form.data.image, form.data.remove_image]);

    if (!item) return null;

    const currentImageUrl = form.data.remove_image ? null : (form.data.image instanceof File ? previewUrl : item.image_url);

    const submit = (e) => {
        e.preventDefault();
        const routerImpl = r();
        if (!routerImpl?.post) return;
        const payload = { ...form.data, _method: 'PUT' };
        if (payload.category_id !== '') payload.category_id = Number(payload.category_id);
        routerImpl.post(`/portal/menu-items/${item.id}`, payload, {
            forceFormData: true,
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit menu item</DialogTitle>
                    <DialogDescription>Update name, category, or photo.</DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    <Input
                        id="edit_name"
                        label="Name"
                        type="text"
                        required
                        value={form.data.name}
                        onChange={(e) => form.setData('name', e.target.value)}
                        error={form.errors.name}
                    />
                    <div className="space-y-2">
                        <label htmlFor="edit_category" className="block text-sm font-bold text-foreground">Category</label>
                        <select
                            id="edit_category"
                            value={form.data.category_id}
                            onChange={(e) => form.setData('category_id', e.target.value ? Number(e.target.value) : '')}
                            className="w-full rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2 text-sm bg-white dark:bg-surface-800 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                            required
                        >
                            {(categories || []).map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <span className="block text-sm font-bold text-foreground">Photo</span>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept={ACCEPT_IMAGES}
                            className="hidden"
                            onChange={(e) => {
                                form.setData('image', e.target.files?.[0] ?? null);
                                if (e.target.files?.[0]) form.setData('remove_image', false);
                            }}
                        />
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="gap-2"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <ImagePlus className="h-4 w-4" />
                                    {form.data.image instanceof File ? form.data.image.name : 'Change photo'}
                                </Button>
                                {(item.image_url || form.data.image) && (
                                    <label className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={form.data.remove_image}
                                            onChange={(e) => {
                                                form.setData('remove_image', e.target.checked);
                                                if (e.target.checked) form.setData('image', null);
                                            }}
                                            className="rounded border-surface-300 text-primary focus:ring-primary"
                                        />
                                        Remove photo
                                    </label>
                                )}
                            </div>
                            {currentImageUrl && (
                                <div className="rounded-xl border border-surface-200 dark:border-surface-600 p-2 inline-flex">
                                    <img src={currentImageUrl} alt="" className="h-24 w-24 object-cover rounded-lg" />
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter className="flex-row justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={form.processing}>Save</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

const UNIT_PRESETS = [10, 20, 30, 50, 100];

function EnableForTodayDialog({ item, open, onOpenChange }) {
    const [units, setUnits] = useState(30);
    const routerImpl = r();

    useEffect(() => {
        if (open && item) {
            setUnits(Math.max(0, Number(item.units_today) || 30));
        }
    }, [open, item?.id]);

    if (!item) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!routerImpl?.put) return;
        routerImpl.put(`/portal/menu-items/${item.id}`, { is_sold_out: false, units_today: units }, { preserveScroll: true });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm w-full sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Enable for today</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <p className="text-sm text-surface-600 dark:text-surface-400">
                        Set the quantity for <strong>{item.name}</strong>.
                    </p>
                    <div>
                        <span className="text-sm font-medium text-surface-700 dark:text-surface-300">Units for today</span>
                        <div className="mt-2 grid grid-cols-3 sm:grid-cols-5 gap-2">
                            {UNIT_PRESETS.map((n) => (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() => setUnits(n)}
                                    className={`
                                        rounded-xl border-2 py-2.5 px-3 text-sm font-semibold transition-colors
                                        ${units === n
                                            ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300 dark:border-primary-500'
                                            : 'border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:border-surface-300 dark:hover:border-surface-500'
                                        }
                                    `}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                        <div className="mt-2">
                            <Input
                                id="enable_units"
                                label="Custom amount"
                                type="number"
                                min="0"
                                value={units}
                                onChange={(e) => setUnits(Math.max(0, parseInt(e.target.value, 10) || 0))}
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex-row justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit">Enable</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function MenuItemCard({ item, onEdit, onEnableClick, lowStockThreshold = 5 }) {
    const routerImpl = r();
    const units = Number(item.units_today ?? 0);
    const currentOrders = Number(item.current_orders ?? 0);
    const soldOut = !!item.is_sold_out;
    const available = Number(item.virtual_available ?? 0);
    const isLowStock = !soldOut && available < lowStockThreshold;

    const setQuantity = (newVal) => {
        const n = Math.max(0, Math.floor(Number(newVal)));
        if (n === units || !routerImpl?.put) return;
        routerImpl.put(`/portal/menu-items/${item.id}`, { units_today: n }, { preserveScroll: true });
    };

    const toggleSoldOut = () => {
        if (!routerImpl?.put) return;
        if (soldOut) {
            onEnableClick?.(item);
        } else {
            routerImpl.put(`/portal/menu-items/${item.id}`, { is_sold_out: true }, { preserveScroll: true });
        }
    };

    const handleDelete = () => {
        if (!window.confirm(`Remove "${item.name}"?`)) return;
        if (routerImpl?.delete) routerImpl.delete(`/portal/menu-items/${item.id}`);
    };

    return (
        <Card className={`overflow-hidden transition-all flex flex-col ${soldOut ? 'opacity-75 ring-2 ring-amber-400/50' : ''}`}>
            <div className="aspect-[3/2] bg-surface-100 dark:bg-surface-800 relative overflow-hidden">
                {item.image_url ? (
                    <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Utensils className="h-10 w-10 text-surface-300 dark:text-surface-600" />
                    </div>
                )}
                {item.category && (
                    <Badge variant="premium" className="absolute top-1 left-1 text-[10px] px-2 py-0.5">
                        {item.category}
                    </Badge>
                )}
                {soldOut && (
                    <div className="absolute inset-0 bg-surface-900/60 flex items-center justify-center">
                        <span className="text-white font-bold text-[10px] uppercase tracking-wider">Sold out</span>
                    </div>
                )}
                {isLowStock && (
                    <div className="low-stock-pulse absolute inset-0 bg-red-500/40 dark:bg-red-600/35 flex items-center justify-center pointer-events-none">
                        <span className="text-white font-bold text-[10px] uppercase tracking-wider drop-shadow-sm">Low stock</span>
                    </div>
                )}
            </div>
            <CardContent className="mt-2.5 p-2.5 flex flex-col flex-1">
                <div className="flex justify-between items-start gap-1">
                    <h3 className="font-semibold text-sm text-surface-900 dark:text-surface-100 line-clamp-2 leading-tight">{item.name}</h3>
                    <span className="font-semibold text-xs text-primary-600 dark:text-primary-400 shrink-0">{formatCurrency(Number(item.price))}</span>
                </div>

                <div className="mt-1.5 space-y-1 text-xs">
                    <div className="flex items-center justify-between gap-1">
                        <span className="text-surface-500 dark:text-surface-400">Qty</span>
                        <div className="flex items-center rounded border border-surface-200 dark:border-surface-600 overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setQuantity(units - 1)}
                                disabled={units <= 0}
                                className="p-1 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-40"
                                aria-label="Decrease"
                            >
                                <Minus className="h-3 w-3" />
                            </button>
                            <span className="min-w-[1.75rem] text-center font-semibold text-xs">{units}</span>
                            <button
                                type="button"
                                onClick={() => setQuantity(units + 1)}
                                className="p-1 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800"
                                aria-label="Increase"
                            >
                                <Plus className="h-3 w-3" />
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-surface-500 dark:text-surface-400">
                        <span>Current orders</span>
                        <span className="font-medium text-surface-700 dark:text-surface-300">{currentOrders}</span>
                    </div>
                </div>

                <div className="mt-2 pt-2 border-t border-surface-200 dark:border-surface-700 flex flex-wrap items-center gap-1">
                    <button
                        type="button"
                        onClick={toggleSoldOut}
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                            soldOut
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                        }`}
                    >
                        {soldOut ? <Power className="h-3 w-3" /> : <PowerOff className="h-3 w-3" />}
                        {soldOut ? 'Enable' : 'Sold out'}
                    </button>
                    <button
                        type="button"
                        onClick={() => onEdit(item)}
                        className="inline-flex items-center gap-1 rounded border border-surface-200 dark:border-surface-600 px-2 py-0.5 text-[10px] font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800"
                    >
                        <Pencil className="h-3 w-3" />
                        Edit
                    </button>
                    <button
                        type="button"
                        onClick={handleDelete}
                        className="inline-flex items-center gap-1 rounded border border-red-200 dark:border-red-800 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                        <Trash2 className="h-3 w-3" />
                        Del
                    </button>
                </div>
            </CardContent>
        </Card>
    );
}

export default function MenuItems({ menuItems = [], categories = [], menuCategories = [], filterCategory = null, totalMenuItems = 0, lowStockCount = 0, lowStockThreshold = 5 }) {
    const [addOpen, setAddOpen] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [enableItem, setEnableItem] = useState(null);

    const items = Array.isArray(menuItems) ? menuItems : menuItems?.data ?? [];
    const links = !Array.isArray(menuItems) && menuItems?.links ? menuItems.links : [];
    const total = !Array.isArray(menuItems) ? menuItems?.total ?? 0 : menuItems.length;
    const categoryList = [{ id: null, name: 'All' }, ...(categories || [])];

    const handleCategoryClick = (cat) => {
        router.get('/portal/menu-items', cat.id == null ? {} : { category: cat.id }, { preserveScroll: false });
    };

    const hasItems = total > 0;
    const currentCategoryId = filterCategory ?? null;
    const currentCategoryName = currentCategoryId != null ? (categories || []).find((c) => c.id === currentCategoryId)?.name : null;

    return (
        <PortalLayout>
            <section className="flex flex-col gap-4 animate-fade-in">
                <PageHeader
                    title="Today's menu"
                    description="Adjust quantity and availability on each card."
                >
                    <Button onClick={() => setAddOpen(true)} className="gap-1.5 text-sm py-2 px-4">
                        <Plus className="h-4 w-4" />
                        Add item
                    </Button>
                </PageHeader>

                <p className="text-sm text-surface-600 dark:text-surface-400">
                    {totalMenuItems} item{totalMenuItems !== 1 ? 's' : ''} on today&apos;s menu
                    {lowStockCount > 0 && (
                        <span className="ml-2 font-medium text-amber-600 dark:text-amber-400">
                            · {lowStockCount} nearing low stock
                        </span>
                    )}
                </p>

                {categoryList.length > 1 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                        {categoryList.map((cat) => (
                            <button
                                key={cat.id ?? 'all'}
                                type="button"
                                onClick={() => handleCategoryClick(cat)}
                                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                                    (cat.id == null && !currentCategoryId) || (cat.id != null && currentCategoryId === cat.id)
                                        ? 'bg-primary-600 text-white dark:bg-primary-500'
                                        : 'bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700'
                                }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                )}

                {!hasItems ? (
                    <div className="rounded-xl border-2 border-dashed border-surface-200 dark:border-surface-700 p-8 text-center text-sm text-surface-500 dark:text-surface-400">
                        {currentCategoryName
                            ? `No items in "${currentCategoryName}".`
                            : 'No menu items for today. Add one above.'}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-3">
                            {items.map((item) => (
                                <MenuItemCard
                                    key={item.id}
                                    item={item}
                                    onEdit={setEditItem}
                                    onEnableClick={setEnableItem}
                                    lowStockThreshold={lowStockThreshold}
                                />
                            ))}
                        </div>
                        {Array.isArray(links) && links.length > 1 && (
                            <nav className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-surface-200 dark:border-surface-700">
                                <span className="text-xs text-surface-500 dark:text-surface-400">
                                    {items.length} of {total} item{total !== 1 ? 's' : ''}
                                </span>
                                <div className="flex flex-wrap justify-end gap-1">
                                    {links.map((link, index) =>
                                        link.url ? (
                                            <Link
                                                key={index}
                                                href={link.url}
                                                preserveScroll
                                                className={`px-2.5 py-1 rounded-md border text-xs ${
                                                    link.active
                                                        ? 'border-surface-500 bg-surface-100 text-surface-800 dark:bg-surface-700 dark:text-surface-200'
                                                        : 'border-surface-200 text-surface-600 hover:bg-surface-100 dark:border-surface-600 dark:text-surface-300 dark:hover:bg-surface-800'
                                                }`}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        ) : (
                                            <span
                                                key={index}
                                                className="px-2.5 py-1 rounded-md text-surface-400 text-xs"
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        )
                                    )}
                                </div>
                            </nav>
                        )}
                    </>
                )}

                <AddMenuItemDialog open={addOpen} onOpenChange={setAddOpen} categories={categories} />
                <EditMenuItemDialog item={editItem} open={Boolean(editItem)} onOpenChange={(open) => !open && setEditItem(null)} categories={categories} />
                <EnableForTodayDialog item={enableItem} open={Boolean(enableItem)} onOpenChange={(open) => !open && setEnableItem(null)} />
            </section>
        </PortalLayout>
    );
}
