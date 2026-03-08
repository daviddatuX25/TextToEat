import { useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import PortalLayout from '../Layouts/PortalLayout';

export default function Account({ user = {} }) {
    const accountForm = useForm({
        name: user.name ?? '',
        username: user.username ?? '',
    });

    useEffect(() => {
        accountForm.setData({
            name: user.name ?? '',
            username: user.username ?? '',
        });
    }, [user.name, user.username]);

    const passwordForm = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const handleAccountSubmit = (e) => {
        e.preventDefault();
        accountForm.put('/portal/account');
    };

    const handlePasswordSubmit = (e) => {
        e.preventDefault();
        passwordForm.put('/portal/account/password');
    };

    return (
        <PortalLayout>
            <section className="flex flex-col gap-8 animate-fade-in">
                <header className="space-y-4">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-surface-900 dark:text-white">
                        Account
                    </h1>
                    <p className="text-surface-600 dark:text-surface-400 text-sm max-w-xl">
                        Update your name and username, or change your password.
                    </p>
                </header>

                <div className="max-w-md rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-surface-900 dark:text-white mb-4">Account details</h2>
                    {user.role && (
                        <div className="mb-4 pb-4 border-b border-surface-200 dark:border-surface-700">
                            <p className="text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400 mb-1">Your role</p>
                            <p className="text-sm text-surface-700 dark:text-surface-300">
                                {user.role === 'admin' || user.role === 'superadmin'
                                    ? 'Administrator — full access to settings, user management, and all portal features.'
                                    : 'Staff — access to orders, deliveries, pickup, walk-in, and conversations. Settings and user management are admin-only.'}
                            </p>
                        </div>
                    )}
                    <form onSubmit={handleAccountSubmit} className="space-y-4 mb-8">
                        <label className="block">
                            <span className="text-sm font-semibold text-surface-700 dark:text-surface-300">Name (optional)</span>
                            <input
                                type="text"
                                value={accountForm.data.name}
                                onChange={(e) => accountForm.setData('name', e.target.value)}
                                className="mt-1 w-full rounded-lg border-2 border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
                                placeholder="Leave blank for device accounts"
                            />
                            {accountForm.errors.name && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{accountForm.errors.name}</p>
                            )}
                        </label>
                        <label className="block">
                            <span className="text-sm font-semibold text-surface-700 dark:text-surface-300">Username</span>
                            <input
                                type="text"
                                required
                                value={accountForm.data.username}
                                onChange={(e) => accountForm.setData('username', e.target.value)}
                                className="mt-1 w-full rounded-lg border-2 border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
                                autoComplete="username"
                            />
                            <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">Letters, numbers, underscores, hyphens only.</p>
                            {accountForm.errors.username && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{accountForm.errors.username}</p>
                            )}
                        </label>
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={accountForm.processing}
                                className="rounded-xl bg-primary-600 text-white px-4 py-2 text-sm font-semibold hover:bg-primary-700 disabled:opacity-50"
                            >
                                {accountForm.processing ? 'Saving…' : 'Save account'}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="max-w-md rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-surface-900 dark:text-white mb-4">Change password</h2>
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <label className="block">
                            <span className="text-sm font-semibold text-surface-700 dark:text-surface-300">Current password</span>
                            <input
                                type="password"
                                required
                                value={passwordForm.data.current_password}
                                onChange={(e) => passwordForm.setData('current_password', e.target.value)}
                                className="mt-1 w-full rounded-lg border-2 border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
                                autoComplete="current-password"
                            />
                            {passwordForm.errors.current_password && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{passwordForm.errors.current_password}</p>
                            )}
                        </label>
                        <label className="block">
                            <span className="text-sm font-semibold text-surface-700 dark:text-surface-300">New password</span>
                            <input
                                type="password"
                                required
                                minLength={8}
                                value={passwordForm.data.password}
                                onChange={(e) => passwordForm.setData('password', e.target.value)}
                                className="mt-1 w-full rounded-lg border-2 border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
                                autoComplete="new-password"
                            />
                            {passwordForm.errors.password && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{passwordForm.errors.password}</p>
                            )}
                        </label>
                        <label className="block">
                            <span className="text-sm font-semibold text-surface-700 dark:text-surface-300">Confirm new password</span>
                            <input
                                type="password"
                                required
                                value={passwordForm.data.password_confirmation}
                                onChange={(e) => passwordForm.setData('password_confirmation', e.target.value)}
                                className="mt-1 w-full rounded-lg border-2 border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
                                autoComplete="new-password"
                            />
                        </label>
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={passwordForm.processing}
                                className="rounded-xl bg-primary-600 text-white px-4 py-2 text-sm font-semibold hover:bg-primary-700 disabled:opacity-50"
                            >
                                {passwordForm.processing ? 'Updating…' : 'Update password'}
                            </button>
                        </div>
                    </form>
                </div>
            </section>
        </PortalLayout>
    );
}
