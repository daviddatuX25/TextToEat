import { Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import PortalLayout from '../Layouts/PortalLayout';
import { PageHeader } from '../components/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Dialog';

export default function Users({ users = [] }) {
    const { auth } = usePage().props;
    const currentUserId = auth?.user?.id;
    const isSuperAdmin = auth?.user?.role === 'superadmin';
    const isAdmin = auth?.user?.is_admin === true;

    const [addOpen, setAddOpen] = useState(false);
    const [deleteUser, setDeleteUser] = useState(null);
    const form = useForm({
        username: '',
        name: '',
        password: '',
        password_confirmation: '',
        role: 'staff',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = {
            username: form.data.username,
            name: form.data.name,
            password: form.data.password,
            password_confirmation: form.data.password_confirmation,
        };
        if (isAdmin) {
            payload.role = form.data.role;
        }
        form.transform(() => payload).post('/portal/users', {
            onSuccess: () => {
                form.reset();
                setAddOpen(false);
            },
        });
    };

    const resetPassword = (user) => {
        router.post(`/portal/users/${user.id}/reset-password`, {}, { preserveScroll: true });
    };

    const confirmDeleteAccount = (user) => {
        setDeleteUser(user);
    };

    const submitDeleteAccount = () => {
        if (!deleteUser) return;
        router.delete(`/portal/users/${deleteUser.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeleteUser(null),
        });
    };

    return (
        <PortalLayout>
            <section className="flex flex-col gap-8 animate-fade-in">
                <PageHeader
                    title="Manage users"
                    description="Role: Admin — full access to settings and user management. Staff — orders, deliveries, pickup, walk-in, and conversations only."
                >
                    <button
                        type="button"
                        onClick={() => { form.reset(); setAddOpen(true); }}
                        className="inline-flex items-center gap-2 rounded-xl border-2 border-primary-500 bg-primary-600 text-white px-4 py-2 text-sm font-semibold hover:bg-primary-700 transition-colors"
                    >
                        <i className="ph-bold ph-plus"></i>
                        Add user
                    </button>
                </PageHeader>

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
                                            <div className="flex items-center justify-end gap-3">
                                                {(isSuperAdmin || user.role !== 'superadmin') && (
                                                    <button
                                                        type="button"
                                                        onClick={() => resetPassword(user)}
                                                        className="text-primary-600 dark:text-primary-400 font-semibold text-sm hover:underline"
                                                    >
                                                        Reset password
                                                    </button>
                                                )}
                                                {user.id !== currentUserId && (isSuperAdmin || (user.role !== 'admin' && user.role !== 'superadmin')) && (
                                                    <button
                                                        type="button"
                                                        onClick={() => confirmDeleteAccount(user)}
                                                        className="text-red-600 dark:text-red-400 font-semibold text-sm hover:underline"
                                                    >
                                                        Deactivate account
                                                    </button>
                                                )}
                                            </div>
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
                        {isAdmin && (
                            <label className="block">
                                <span className="text-sm font-semibold text-surface-700 dark:text-surface-300">Role</span>
                                <select
                                    value={form.data.role}
                                    onChange={(e) => form.setData('role', e.target.value)}
                                    className="mt-1 w-full rounded-lg border-2 border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
                                >
                                    <option value="staff">Staff</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </label>
                        )}
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

            <Dialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Deactivate account</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-surface-600 dark:text-surface-400">
                        {deleteUser && (
                            <>
                                Deactivate <strong>{deleteUser.name || deleteUser.username}</strong>? They will no longer be able to sign in. You can restore the account later from the database if needed.
                            </>
                        )}
                    </p>
                    <div className="flex gap-2 pt-4">
                        <button
                            type="button"
                            onClick={() => setDeleteUser(null)}
                            className="flex-1 py-2 rounded-xl border border-surface-200 dark:border-surface-600 text-surface-700 dark:text-surface-300 font-medium text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={submitDeleteAccount}
                            className="flex-1 py-2 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700"
                        >
                            Deactivate
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </PortalLayout>
    );
}
