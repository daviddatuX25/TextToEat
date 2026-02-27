import { useState, useEffect } from 'react';
import { router, useForm } from '@inertiajs/react';
import PortalLayout from '../Layouts/PortalLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { Plus, Pencil, Trash2, Power, PowerOff } from 'lucide-react';

const routerOpts = () => ({
    preserveScroll: true,
});

function AddMenuItemDialog({ open, onOpenChange }) {
    const form = useForm({
        name: '',
        price: '',
        category: 'Ulam',
        units_today: 30,
    });

    useEffect(() => {
        if (!open) form.reset();
    }, [open]);

    const submit = (e) => {
        e.preventDefault();
        form.post('/portal/menu-items', {
            onSuccess: () => {
                form.reset();
                onOpenChange(false);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Add menu item</DialogTitle>
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
                        placeholder="e.g. Chicken Adobo"
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
                        placeholder="0.00"
                    />
                    <Input
                        id="add_category"
                        label="Category"
                        type="text"
                        required
                        value={form.data.category}
                        onChange={(e) => form.setData('category', e.target.value)}
                        error={form.errors.category}
                        placeholder="e.g. Ulam, Merienda"
                    />
                    <Input
                        id="add_units"
                        label="Units today"
                        type="number"
                        min="0"
                        required
                        value={form.data.units_today}
                        onChange={(e) => form.setData('units_today', parseInt(e.target.value, 10) || 0)}
                        error={form.errors.units_today}
                        placeholder="30"
                    />
                    {Object.keys(form.errors).length > 0 && (
                        <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                            {Object.entries(form.errors).map(([k, v]) => (
                                <li key={k}>{v}</li>
                            ))}
                        </ul>
                    )}
                    <button type="submit" disabled={form.processing} className="w-full py-2.5 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-50">
                        {form.processing ? 'Adding…' : 'Add item'}
                    </button>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function EditMenuItemDialog({ item, open, onOpenChange }) {
    const form = useForm({
        name: item?.name ?? '',
        price: item ? String(item.price) : '',
        category: item?.category ?? 'Ulam',
        units_today: item?.units_today ?? 30,
        is_sold_out: item?.is_sold_out ?? false,
    });

    useEffect(() => {
        if (item) {
            form.setData({
                name: item.name,
                price: String(item.price ?? ''),
                category: item.category ?? 'Ulam',
                units_today: item.units_today ?? 30,
                is_sold_out: !!item.is_sold_out,
            });
        }
    }, [item?.id]);

    if (!item) return null;

    const submit = (e) => {
        e.preventDefault();
        form.put(`/portal/menu-items/${item.id}`, {
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit menu item</DialogTitle>
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
                    <Input
                        id="edit_price"
                        label="Price (₱)"
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={form.data.price}
                        onChange={(e) => form.setData('price', e.target.value)}
                        error={form.errors.price}
                    />
                    <Input
                        id="edit_category"
                        label="Category"
                        type="text"
                        required
                        value={form.data.category}
                        onChange={(e) => form.setData('category', e.target.value)}
                        error={form.errors.category}
                    />
                    <Input
                        id="edit_units"
                        label="Units today"
                        type="number"
                        min="0"
                        required
                        value={form.data.units_today}
                        onChange={(e) => form.setData('units_today', parseInt(e.target.value, 10) || 0)}
                        error={form.errors.units_today}
                    />
                    <div>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.data.is_sold_out}
                                onChange={(e) => form.setData('is_sold_out', e.target.checked)}
                                className="rounded border-surface-300 text-primary-600"
                            />
                            <span className="text-sm font-semibold text-surface-700 dark:text-surface-300">Sold out (deactivate)</span>
                        </label>
                        <p className="text-xs text-surface-500 mt-1">When checked, this item is hidden from the menu for customers.</p>
                    </div>
                    {Object.keys(form.errors).length > 0 && (
                        <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                            {Object.entries(form.errors).map(([k, v]) => (
                                <li key={k}>{v}</li>
                            ))}
                        </ul>
                    )}
                    <button type="submit" disabled={form.processing} className="w-full py-2.5 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-50">
                        {form.processing ? 'Saving…' : 'Save'}
                    </button>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function MenuCard({ item, onEdit, onDelete, onToggleActive }) {
    const isSoldOut = !!item.is_sold_out;
    const isActive = !isSoldOut;

    return (
        <div
            className={`rounded-2xl border-2 overflow-hidden transition-all ${
                isSoldOut
                    ? 'opacity-60 border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50'
                    : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-sm hover:shadow-md'
            }`}
        >
            {item.image_url && (
                <div className="aspect-[4/3] bg-surface-100 dark:bg-surface-800">
                    <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                </div>
            )}
            <div className="p-4">
                <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="font-bold text-surface-900 dark:text-surface-100 line-clamp-2">{item.name}</h3>
                    <span className="font-bold text-primary-600 dark:text-primary-400 shrink-0">₱{Number(item.price).toFixed(2)}</span>
                </div>
                <p className="text-xs text-surface-500 dark:text-surface-400 mb-3">{item.category} · {item.units_today ?? 0} units</p>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => onToggleActive(item)}
                        title={isActive ? 'Deactivate (mark sold out)' : 'Activate'}
                        className={`inline-flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg text-sm font-medium border shrink-0 ${
                            isActive
                                ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                                : 'border-surface-200 dark:border-surface-600 bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'
                        }`}
                    >
                        {isActive ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                        {isActive ? 'Active' : 'Inactive'}
                    </button>
                    <button
                        type="button"
                        onClick={() => onEdit(item)}
                        className="inline-flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg border border-surface-200 dark:border-surface-600 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 text-sm font-medium"
                        aria-label="Edit"
                    >
                        <Pencil className="h-4 w-4" />
                        Edit
                    </button>
                    <button
                        type="button"
                        onClick={() => window.confirm(`Remove "${item.name}" from today's menu?`) && onDelete(item)}
                        className="inline-flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 text-sm font-medium"
                        aria-label="Delete"
                    >
                        <Trash2 className="h-4 w-4" />
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function MenuItems({ menuItems = [] }) {
    const [addOpen, setAddOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    const handleEdit = (item) => {
        setEditingItem(item);
        setEditOpen(true);
    };

    const handleDelete = (item) => {
        router.delete(`/portal/menu-items/${item.id}`, routerOpts());
    };

    const handleToggleActive = (item) => {
        router.put(`/portal/menu-items/${item.id}`, {
            is_sold_out: !item.is_sold_out,
        }, routerOpts());
    };

    return (
        <PortalLayout>
            <section className="flex flex-col gap-8 animate-fade-in">
                <header className="space-y-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-sm font-semibold tracking-wide text-primary-600 dark:border-primary-500/20 dark:bg-primary-500/10 dark:text-primary-400">
                        <i className="ph-bold ph-book-open"></i>
                        Today&apos;s menu
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-surface-900 dark:text-white">Today&apos;s menu</h1>
                        <button
                            type="button"
                            onClick={() => setAddOpen(true)}
                            className="inline-flex items-center gap-2 bg-primary-600 text-white font-semibold py-2.5 px-4 rounded-xl hover:bg-primary-700 smooth-hover shadow-md"
                        >
                            <Plus className="h-5 w-5" />
                            Add menu item
                        </button>
                    </div>
                </header>

                <p className="text-surface-600 dark:text-surface-400">{menuItems.length} item(s). Activate or deactivate items to show or hide them from the customer menu.</p>

                {menuItems.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-surface-200 dark:border-surface-700 p-12 text-center text-surface-500">
                        No menu items for today. Add one above.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {menuItems.map((item) => (
                            <MenuCard
                                key={item.id}
                                item={item}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onToggleActive={handleToggleActive}
                            />
                        ))}
                    </div>
                )}
            </section>

            <AddMenuItemDialog open={addOpen} onOpenChange={setAddOpen} />
            <EditMenuItemDialog item={editingItem} open={editOpen} onOpenChange={(open) => { if (!open) setEditingItem(null); setEditOpen(open); }} />
        </PortalLayout>
    );
}
