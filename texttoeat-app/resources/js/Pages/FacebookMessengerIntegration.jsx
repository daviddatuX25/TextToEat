import { router } from '@inertiajs/react';
import { useState } from 'react';
import { CheckCircle, XCircle, Menu, Loader2 } from 'lucide-react';
import PortalLayout from '../Layouts/PortalLayout';
import { Card, CardContent, CardHeader } from '../components/ui';
import { Button } from '../components/ui/Button';

export default function FacebookMessengerIntegration({
    token_configured = false,
    webhook_url = '',
    persistent_menu = [],
}) {
    const [settingMenu, setSettingMenu] = useState(false);

    const handleSetPersistentMenu = () => {
        setSettingMenu(true);
        router.post('/portal/facebook-messenger/set-persistent-menu', {}, {
            preserveScroll: true,
            onFinish: () => setSettingMenu(false),
        });
    };

    return (
        <PortalLayout>
            <section className="flex flex-col gap-8 animate-fade-in pt-2 pb-12">
                <header className="space-y-3">
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-surface-900 dark:text-white">
                        Facebook Messenger integration
                    </h1>
                    <p className="text-surface-500 dark:text-surface-400 text-sm">
                        Manage the Messenger bot and persistent menu (≡) shown next to the composer. Set the menu so users can tap Home, Track order, or Talk to staff without typing.
                    </p>
                </header>

                <Card className="rounded-2xl border-surface-200 dark:border-surface-700 overflow-hidden">
                    <CardHeader className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/80 dark:bg-surface-900/40 px-6 py-5">
                        <p className="text-sm font-semibold text-surface-800 dark:text-surface-100 inline-flex items-center gap-2">
                            Connection status
                        </p>
                    </CardHeader>
                    <CardContent className="p-6 sm:p-8 space-y-5">
                        <div className="flex items-center gap-3">
                            {token_configured ? (
                                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            ) : (
                                <XCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                            )}
                            <span className="text-surface-700 dark:text-surface-300">
                                Page access token: {token_configured ? 'Configured' : 'Not set (add FACEBOOK_PAGE_ACCESS_TOKEN to .env)'}
                            </span>
                        </div>
                        {webhook_url && (
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-surface-700 dark:text-surface-300">Webhook URL</p>
                                <p className="text-sm text-surface-600 dark:text-surface-400 font-mono break-all bg-surface-100 dark:bg-surface-800 px-3 py-2 rounded-lg">
                                    {webhook_url}
                                </p>
                                <p className="text-xs text-surface-500 dark:text-surface-500">
                                    Use this URL in Meta Developer Dashboard → Messenger → Webhooks.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-surface-200 dark:border-surface-700 overflow-hidden">
                    <CardHeader className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/80 dark:bg-surface-900/40 flex flex-row items-center justify-between gap-4 flex-wrap px-6 py-5">
                        <p className="text-sm font-semibold text-surface-800 dark:text-surface-100 inline-flex items-center gap-2">
                            <Menu className="h-4 w-4" />
                            Persistent menu (≡)
                        </p>
                        <Button
                            type="button"
                            onClick={handleSetPersistentMenu}
                            disabled={!token_configured || settingMenu}
                        >
                            {settingMenu ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : null}
                            <span className={settingMenu ? 'ml-2' : ''}>
                                {settingMenu ? 'Setting…' : 'Set persistent menu'}
                            </span>
                        </Button>
                    </CardHeader>
                    <CardContent className="p-6 sm:p-8">
                        <p className="text-sm text-surface-600 dark:text-surface-400 mb-5 pt-1">
                            The hamburger menu next to the composer will show these options. Click &quot;Set persistent menu&quot; to send them to Facebook.
                        </p>
                        {persistent_menu.length > 0 ? (
                            <ul className="space-y-2">
                                {persistent_menu.map((item, i) => (
                                    <li
                                        key={item.payload ?? i}
                                        className="flex items-center gap-3 py-3 px-4 rounded-lg bg-surface-50 dark:bg-surface-800/50"
                                    >
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400 text-sm font-bold">
                                            {i + 1}
                                        </span>
                                        <span className="font-medium text-surface-800 dark:text-surface-200">{item.title}</span>
                                        <span className="text-xs text-surface-500 dark:text-surface-500 font-mono">{item.payload}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-surface-500 dark:text-surface-500">No menu items configured.</p>
                        )}
                    </CardContent>
                </Card>
            </section>
        </PortalLayout>
    );
}
