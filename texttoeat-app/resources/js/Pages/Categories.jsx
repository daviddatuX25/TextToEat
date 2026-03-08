import { useState, useEffect } from 'react';
import { router, usePage, useForm } from '@inertiajs/react';
import { toast } from 'sonner';
import PortalLayout from '../Layouts/PortalLayout';
import { Card, CardContent, PageHeader } from '../components/ui';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Dialog';
import { Plus, Pencil, Trash2, LayoutList } from 'lucide-react';

function AddCategoryDialog({ open, onOpenChange }) {
    const form = useForm({ name: '', sort_order: '' });
    useEffect(() => {
        if (!open) form.reset();
    }, [open]);
    const submit = (e) => {
        e.preventDefault();
        form.transform((data) => ({
            ...data,
            sort_order: data.sort_order ? Number(data.sort_order) : null,
        })).post('/portal/categories', {
            onSuccess: () => { form.reset(); onOpenChange(false); },
        });
    };
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Add category</DialogTitle>
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
                        id="add_sort_order"
                        label="Sort order (optional)"
                        type="number"
                        min="0"
                        value={form.data.sort_order}
                        onChange={(e) => form.setData('sort_order', e.target.value)}
                        error={form.errors.sort_order}
                    />
                    <div className="flex gap-2 justify-end">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={form.processing}>Add</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function EditCategoryDialog({ category, open, onOpenChange }) {
    const form = useForm({
        name: category?.name ?? '',
        sort_order: category?.sort_order != null ? String(category.sort_order) : '',
    });
    useEffect(() => {
        if (open && category) {
            form.setData({ name: category.name, sort_order: category.sort_order != null ? String(category.sort_order) : '' });
            form.clearErrors();
        }
    }, [open, category?.id]);
    if (!category) return null;
    const submit = (e) => {
        e.preventDefault();
        form.transform((data) => ({
            ...data,
            sort_order: data.sort_order ? Number(data.sort_order) : null,
        })).put(`/portal/categories/${category.id}`, {
            onSuccess: () => onOpenChange(false),
        });
    };
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit category</DialogTitle>
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
                        id="edit_sort_order"
                        label="Sort order (optional)"
                        type="number"
                        min="0"
                        value={form.data.sort_order}
                        onChange={(e) => form.setData('sort_order', e.target.value)}
                        error={form.errors.sort_order}
                    />
                    <div className="flex gap-2 justify-end">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={form.processing}>Save</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default function Categories({ categories = [] }) {
    const { flash } = usePage().props;
    const [addOpen, setAddOpen] = useState(false);
    const [editCategory, setEditCategory] = useState(null);
    const [deleteCategory, setDeleteCategory] = useState(null);

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash?.success, flash?.error]);

    const handleDelete = (cat) => {
        if (cat.menu_items_count > 0) {
            if (!window.confirm(`${cat.name} is used by ${cat.menu_items_count} menu item(s). It will be hidden from new items but existing data is preserved. Remove anyway?`)) return;
        } else {
            if (!window.confirm(`Remove "${cat.name}"?`)) return;
        }
        router.delete(`/portal/categories/${cat.id}`);
        setDeleteCategory(null);
    };

    return (
        <PortalLayout>
            <section className="flex flex-col gap-6 animate-fade-in pt-2 pb-12">
                <PageHeader
                    title={
                        <>
                            <LayoutList className="h-9 w-9 text-primary-500" />
                            Categories
                        </>
                    }
                    titleClassName="flex items-center gap-3"
                    description="Manage food categories for today's menu. Deleting only hides the category from new items; existing orders keep the category name."
                />

                <div className="flex justify-end">
                    <Button onClick={() => setAddOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add category
                    </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {categories.map((cat) => (
                        <Card key={cat.id} className="rounded-xl border-surface-200 dark:border-surface-700">
                            <CardContent className="p-4 flex flex-col gap-2">
                                <div className="flex justify-between items-start gap-2">
                                    <div>
                                        <h3 className="font-semibold text-surface-900 dark:text-surface-100">{cat.name}</h3>
                                        {cat.sort_order != null && (
                                            <p className="text-xs text-surface-500 dark:text-surface-400">Order: {cat.sort_order}</p>
                                        )}
                                        {cat.menu_items_count > 0 && (
                                            <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                                                {cat.menu_items_count} menu item(s)
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={() => setEditCategory(cat)}
                                            aria-label="Edit"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 dark:text-red-400"
                                            onClick={() => handleDelete(cat)}
                                            aria-label="Delete"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {categories.length === 0 && (
                    <p className="text-sm text-surface-500 dark:text-surface-400">No categories yet. Add one to use with menu items.</p>
                )}
            </section>

            <AddCategoryDialog open={addOpen} onOpenChange={setAddOpen} />
            <EditCategoryDialog category={editCategory} open={Boolean(editCategory)} onOpenChange={(open) => !open && setEditCategory(null)} />
        </PortalLayout>
    );
}
