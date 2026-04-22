import { App } from '@capacitor/app';
import { router } from '@inertiajs/react';

const ROOT_PATHS = ['/', '/menu'];

function isRootPage(pathname) {
    const normalized = pathname.replace(/\/+$/, '') || '/';
    return ROOT_PATHS.includes(normalized);
}

let registered = false;

export function setupCapacitorBackButton() {
    if (!window.Capacitor?.isNativePlatform()) return;
    if (registered) return;
    registered = true;

    App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
            window.history.back();
        } else if (isRootPage(window.location.pathname)) {
            App.exitApp();
        } else {
            router.visit('/');
        }
    });
}