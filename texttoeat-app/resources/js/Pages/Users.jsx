import { Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import PortalLayout from '../Layouts/PortalLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Dialog';

export default function Users({ users = [] }) {
    const [addOpen, setAddOpen] = useState(false);
    const form = useForm({
        username: '',
        name: '',
        password: '',
        password_confirmation: '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        form.post('/portal/users', {
            onSuccess: () => {
                form.reset();
                setAddOpen(false);
            },
        });
    };

    const resetPassword = (user) => {
        router.post(`/portal/users/${user.id}/reset-password`, {}, { preserveScroll: true });
    };

    return (
        <PortalLayout>
            <section className="flex flex-col gap-8 animate-fade-in">
                <header className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-surface-900 dark:text-white">
                            Manage users
                        </h1>
                        <button
                            type="button"
                            onClick={() => { form.reset(); setAddOpen(true); }}
                            className="inline-flex items-center gap-2 rounded-xl border-2 border-primary-500 bg-primary-600 text-white px-4 py-2 text-sm font-semibold hover:bg-primary-700 transition-colors"
                        >
                            <i className="ph-bold ph-plus"></i>
                            Add user
                        </button>
                    </div>
                    <p className="text-surface-500 dark:text-surface-400 text-xs">
                        <strong>Role:</strong> <span className="font-medium text-surface-600 dark:text-surface-300">Admin</span> — full access to settings and user management. <span className="font-medium text-surface-600 dark:text-surface-300">Staff</span> — orders, deliveries, pickup, walk-in, and conversations only.
                    </p>
                </header>

                {users.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-surface-200 dark:border-surface-700 p-8 text-center text-surface-500">
                        No users yet. Add one above.
                    </div>
                ) : (
                    <div className="rounded-2xl border border-surface-200 dark:border-surface-700 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-surface-100 dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-surface-700 dark:text-surface-300">Name</th>
                                    <th className="px-4 py-3 font-semibold text-surface-700 dark:text-surface-300">Username</th>
                                    <th className="px-4 py-3 font-semibold text-surface-700 dark:text-surface-300">Role</th>
                                    <th className="px-4 py-3 font-semibold text-surface-700 dark:text-surface-300 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                                {users.map((user) => (
                                    <tr key={user.id} className="bg-white dark:bg-surface-900 hover:bg-surface-50 dark:hover:bg-surface-800/50">
                                        <td className="px-4 py-3 font-medium text-surface-900 dark:text-white">{user.name ?? '—'}</td>
                                        <td className="px-4 py-3 text-surface-600 dark:text-surface-400">{user.username}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${user.role === 'admin' || user.role === 'superadmin' ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300' : 'bg-surface-200 text-surface-700 dark:bg-surface-600 dark:text-surface-300'}`} title={user.role === 'admin' || user.role === 'superadmin' ? 'Full access to settings and user management' : 'Orders, deliveries, and conversations only'}>
                                                {user.role === 'superadmin' ? 'Super admin' : (user.role ?? 'staff')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() => resetPassword(user)}
                                                className="text-primary-600 dark:text-primary-400 font-semibold text-sm hover:underline"
                                            >
                                                Reset password
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add user</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <label className="block">
                            <span className="text-sm font-semibold text-surface-700 dark:text-surface-300">Username</span>
                            <input
                                type="text"
                                required
                                value={form.data.username}
                                onChange={(e) => form.setData('username', e.target.value)}
                                className="mt-1 w-full rounded-lg border-2 border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
                                autoComplete="username"
                            />
                            <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">Letters, numbers, underscores, hyphens only.</p>
                        </label>
                        <label className="block">
                            <span className="text-sm font-semibold text-surface-700 dark:text-surface-300">Name (optional)</span>
                            <input
                                type="text"
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                                className="mt-1 w-full rounded-lg border-2 border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
                                placeholder="Leave blank for device accounts"
                            />
                        </label>
                        <label className="block">
                            <span className="text-sm font-semibold text-surface-700 dark:text-surface-300">Password</span>
                            <input
                                type="password"
                                required
                                minLength={8}
                                value={form.data.password}
                                onChange={(e) => form.setData('password', e.target.value)}
                                className="mt-1 w-full rounded-lg border-2 border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
                            />
                        </label>
                        <label className="block">
                            <span className="text-sm font-semibold text-surface-700 dark:text-surface-300">Confirm password</span>
                            <input
                                type="password"
                                required
                                value={form.data.password_confirmation}
                                onChange={(e) => form.setData('password_confirmation', e.target.value)}
                                className="mt-1 w-full rounded-lg border-2 border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
                            />
                        </label>
                        {Object.keys(form.errors).length > 0 && (
                            <ul className="text-sm text-red-600 dark:text-red-400">
                                {Object.entries(form.errors).map(([k, v]) => (
                                    <li key={k}>{v}</li>
                                ))}
                            </ul>
                        )}
                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setAddOpen(false)}
                                className="flex-1 py-2 rounded-xl border border-surface-200 dark:border-surface-600 text-surface-700 dark:text-surface-300 font-medium text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={form.processing}
                                className="flex-1 py-2 rounded-xl bg-primary-600 text-white font-semibold text-sm hover:bg-primary-700 disabled:opacity-50"
                            >
                                {form.processing ? 'Creating...' : 'Create user'}
                            </button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </PortalLayout>
    );
}
