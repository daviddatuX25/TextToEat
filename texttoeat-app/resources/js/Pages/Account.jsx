import { useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import PortalLayout from '../Layouts/PortalLayout';
import { PageHeader } from '../components/ui';

function getPasswordStrength(pwd) {
    if (!pwd) return null;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 1) return { bars: 1, label: 'Weak', barColor: 'bg-red-500', textColor: 'text-red-500' };
    if (score === 2) return { bars: 2, label: 'Fair', barColor: 'bg-amber-500', textColor: 'text-amber-500' };
    if (score === 3) return { bars: 3, label: 'Good', barColor: 'bg-yellow-400', textColor: 'text-yellow-500' };
    return { bars: 4, label: 'Strong', barColor: 'bg-green-500', textColor: 'text-green-500' };
}

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
        passwordForm.put('/portal/account/password', {
            onSuccess: () => passwordForm.reset(),
        });
    };

    const newPasswordStrength = getPasswordStrength(passwordForm.data.password);

    return (
        <PortalLayout>
            <section className="flex flex-col gap-8 animate-fade-in">
                <PageHeader
                    title="Account"
                    description="Update your name and username, or change your password."
                />

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
                        <div className="block">
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
                            </label>
                            {newPasswordStrength && (
                                <div className="mt-2">
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4].map((i) => (
                                            <div
                                                key={i}
                                                className={`h-1.5 flex-1 rounded-full transition-colors ${i <= newPasswordStrength.bars ? newPasswordStrength.barColor : 'bg-surface-200 dark:bg-surface-700'}`}
                                            />
                                        ))}
                                    </div>
                                    <p className={`mt-1 text-xs font-medium ${newPasswordStrength.textColor}`}>
                                        {newPasswordStrength.label}
                                    </p>
                                </div>
                            )}
                            {passwordForm.errors.password && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{passwordForm.errors.password}</p>
                            )}
                        </div>
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
