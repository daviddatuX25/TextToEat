import { App } from '@capacitor/app';
import { router } from '@inertiajs/react';

export function setupCapacitorBackButton() {
    if (!window.Capacitor?.isNativePlatform()) return;

    App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
            window.history.back();
        } else {
            const currentPath = window.location.pathname;
            if (currentPath === '/' || currentPath === '/menu') {
                App.exitApp();
            } else {
                router.visit('/');
            }
        }
    });
}