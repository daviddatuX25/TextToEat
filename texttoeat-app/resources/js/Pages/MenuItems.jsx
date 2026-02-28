import { useState, useEffect, useRef } from 'react';
import { router, useForm } from '@inertiajs/react';
import PortalLayout from '../Layouts/PortalLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { Plus, Pencil, Trash2, Power, PowerOff, Utensils, ImagePlus, X } from 'lucide-react';

const routerOpts = () => ({
    preserveScroll: true,
});

const ACCEPT_IMAGES = 'image/jpeg,image/png,image/webp';

function AddMenuItemDialog({ open, onOpenChange, categories = [] }) {
    const form = useForm({
        name: '',
        price: '',
        category: 'Ulam',
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
        form.post('/portal/menu-items', {
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
                    <div>
                        <label htmlFor="add_category" className="block text-sm font-bold text-surface-700 dark:text-surface-300 mb-2">Category</label>
                        <select
                            id="add_category"
                            required
                            value={form.data.category}
                            onChange={(e) => form.setData('category', e.target.value)}
                            className="w-full rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-900 px-3 py-2 text-sm text-surface-900 dark:text-surface-100"
                        >
                            {categories.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        {form.errors.category && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{form.errors.category}</p>}
                    </div>
                    <Input
                        id="add_units"
                        label="Stock (units today)"
                        type="number"
                        min="0"
                        required
                        value={form.data.units_today}
                        onChange={(e) => form.setData('units_today', parseInt(e.target.value, 10) || 0)}
                        error={form.errors.units_today}
                        placeholder="30"
                    />
                    <p className="text-xs text-surface-500 dark:text-surface-400 -mt-2">Displayed as &quot;Good for X orders&quot; to customers.</p>
                    <div>
                        <label className="block text-sm font-bold text-surface-700 dark:text-surface-300 mb-2">Image (optional)</label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept={ACCEPT_IMAGES}
                            className="hidden"
                            onChange={(e) => form.setData('image', e.target.files?.[0] ?? null)}
                        />
                        {previewUrl ? (
                            <div className="relative inline-block rounded-xl overflow-hidden border-2 border-surface-200 dark:border-surface-600">
                                <img src={previewUrl} alt="" className="h-32 w-auto object-cover" />
                                <button
                                    type="button"
                                    onClick={() => { form.setData('image', null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                    className="absolute top-2 right-2 p-1.5 rounded-full bg-surface-900/70 text-white hover:bg-surface-900"
                                    aria-label="Remove image"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 rounded-xl border-2 border-dashed border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-800/50 px-4 py-3 text-sm font-medium text-surface-600 dark:text-surface-400 hover:border-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-900/20"
                            >
                                <ImagePlus className="h-5 w-5" />
                                Choose image (JPEG, PNG, WebP, max 2MB)
                            </button>
                        )}
                        {form.errors.image && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">{form.errors.image}</p>
                        )}
                    </div>
                    {Object.keys(form.errors).filter((k) => k !== 'image').length > 0 && (
                        <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                            {Object.entries(form.errors)
                                .filter(([k]) => k !== 'image')
                                .map(([k, v]) => (
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

function EditMenuItemDialog({ item, open, onOpenChange, categories = [] }) {
    const form = useForm({
        name: item?.name ?? '',
        price: item ? String(item.price) : '',
        category: item?.category ?? 'Ulam',
        units_today: item?.units_today ?? 30,
        is_sold_out: item?.is_sold_out ?? false,
        image: null,
        remove_image: false,
    });
    const fileInputRef = useRef(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    useEffect(() => {
        if (item) {
            form.setData({
                name: item.name,
                price: String(item.price ?? ''),
                category: item.category ?? 'Ulam',
                units_today: item.units_today ?? 30,
                is_sold_out: !!item.is_sold_out,
                image: null,
                remove_image: false,
            });
            setPreviewUrl(null);
        }
    }, [item?.id]);

    useEffect(() => {
        if (form.data.image instanceof File) {
            const url = URL.createObjectURL(form.data.image);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        }
        setPreviewUrl(null);
    }, [form.data.image]);

    if (!item) return null;

    const currentImageUrl = form.data.remove_image ? null : (form.data.image instanceof File ? previewUrl : item.image_url);

    const submit = (e) => {
        e.preventDefault();
        form.transform((data) => ({ ...data, _method: 'PUT' })).post(`/portal/menu-items/${item.id}`, {
            forceFormData: true,
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
                    <div>
                        <label htmlFor="edit_category" className="block text-sm font-bold text-surface-700 dark:text-surface-300 mb-2">Category</label>
                        <select
                            id="edit_category"
                            required
                            value={form.data.category}
                            onChange={(e) => form.setData('category', e.target.value)}
                            className="w-full rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-900 px-3 py-2 text-sm text-surface-900 dark:text-surface-100"
                        >
                            {categories.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        {form.errors.category && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{form.errors.category}</p>}
                    </div>
                    <Input
                        id="edit_units"
                        label="Stock (units today)"
                        type="number"
                        min="0"
                        required
                        value={form.data.units_today}
                        onChange={(e) => form.setData('units_today', parseInt(e.target.value, 10) || 0)}
                        error={form.errors.units_today}
                    />
                    <p className="text-xs text-surface-500 dark:text-surface-400 -mt-2">Displayed as &quot;Good for X orders&quot; to customers.</p>
                    <div>
                        <label className="block text-sm font-bold text-surface-700 dark:text-surface-300 mb-2">Image</label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept={ACCEPT_IMAGES}
                            className="hidden"
                            onChange={(e) => {
                                form.setData({ image: e.target.files?.[0] ?? null, remove_image: false });
                            }}
                        />
                        {currentImageUrl ? (
                            <div className="flex items-start gap-3">
                                <div className="relative rounded-xl overflow-hidden border-2 border-surface-200 dark:border-surface-600 shrink-0">
                                    <img src={currentImageUrl} alt="" className="h-28 w-32 object-cover" />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                                    >
                                        <ImagePlus className="h-4 w-4" />
                                        Change image
                                    </button>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={form.data.remove_image}
                                            onChange={(e) => form.setData('remove_image', e.target.checked)}
                                            className="rounded border-surface-300 text-primary-600"
                                        />
                                        <span className="text-sm text-surface-600 dark:text-surface-400">Remove image</span>
                                    </label>
                                </div>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 rounded-xl border-2 border-dashed border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-800/50 px-4 py-3 text-sm font-medium text-surface-600 dark:text-surface-400 hover:border-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-900/20"
                            >
                                <ImagePlus className="h-5 w-5" />
                                Choose image (JPEG, PNG, WebP, max 2MB)
                            </button>
                        )}
                        {form.errors.image && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">{form.errors.image}</p>
                        )}
                    </div>
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
                    {Object.keys(form.errors).filter((k) => k !== 'image').length > 0 && (
                        <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                            {Object.entries(form.errors)
                                .filter(([k]) => k !== 'image')
                                .map(([k, v]) => (
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

function MenuCard({ item, onEdit, onDelete, onToggleActive, onUnitsChange }) {
    const isSoldOut = !!item.is_sold_out;
    const isActive = !isSoldOut;
    const [stockInput, setStockInput] = useState('');
    const [editingStock, setEditingStock] = useState(false);

    const units = item.units_today ?? 0;
    const handleStockBlur = () => {
        if (!onUnitsChange) return;
        const val = parseInt(stockInput, 10);
        if (!Number.isNaN(val) && val >= 0 && val !== units) {
            onUnitsChange(item, val);
        }
        setEditingStock(false);
        setStockInput('');
    };

    return (
        <div
            className={`rounded-2xl border-2 overflow-hidden transition-all ${
                isSoldOut
                    ? 'opacity-60 border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50'
                    : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-sm hover:shadow-md'
            }`}
        >
            <div className="aspect-[4/3] bg-surface-100 dark:bg-surface-800 flex items-center justify-center overflow-hidden">
                {item.image_url ? (
                    <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                    <Utensils className="h-14 w-14 text-surface-300 dark:text-surface-600" />
                )}
            </div>
            <div className="p-4">
                <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="font-bold text-surface-900 dark:text-surface-100 line-clamp-2">{item.name}</h3>
                    <span className="font-bold text-primary-600 dark:text-primary-400 shrink-0">₱{Number(item.price).toFixed(2)}</span>
                </div>
                <div className="text-xs text-surface-500 dark:text-surface-400 mb-3 flex items-center gap-2 flex-wrap">
                    <span>{item.category}</span>
                    <span>·</span>
                    {editingStock && onUnitsChange ? (
                        <input
                            type="number"
                            min="0"
                            className="w-16 rounded border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-2 py-0.5 text-surface-900 dark:text-surface-100"
                            value={stockInput}
                            onChange={(e) => setStockInput(e.target.value)}
                            onBlur={handleStockBlur}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleStockBlur(); }}
                            autoFocus
                        />
                    ) : (
                        <button
                            type="button"
                            onClick={() => { if (onUnitsChange) { setStockInput(String(units)); setEditingStock(true); } }}
                            className={`text-left ${onUnitsChange ? 'hover:underline cursor-pointer' : ''}`}
                        >
                            Good for {units} order{units !== 1 ? 's' : ''}
                        </button>
                    )}
                </div>
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

export default function MenuItems({ menuItems = [], categories = [] }) {
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

    const handleUnitsChange = (item, unitsToday) => {
        router.put(`/portal/menu-items/${item.id}`, { units_today: unitsToday }, routerOpts());
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
                                onUnitsChange={handleUnitsChange}
                            />
                        ))}
                    </div>
                )}
            </section>

            <AddMenuItemDialog open={addOpen} onOpenChange={setAddOpen} categories={categories} />
            <EditMenuItemDialog item={editingItem} open={editOpen} onOpenChange={(open) => { if (!open) setEditingItem(null); setEditOpen(open); }} categories={categories} />
        </PortalLayout>
    );
}
