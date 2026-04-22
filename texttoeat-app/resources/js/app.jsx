import './bootstrap';

import { createInertiaApp, router } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import { TooltipProvider } from './components/ui';
import { setupCapacitorBackButton } from './capacitor-back-button';

if (typeof window !== 'undefined') {
    window.__inertia_router = router;
    setupCapacitorBackButton();
}

const pages = import.meta.glob('./Pages/**/*.jsx');

createInertiaApp({
    title: (title) => title ? `${title} - TextToEat` : 'TextToEat',
    resolve: (name) => {
        const key = `./Pages/${name}.jsx`;
        const loader = pages[key];
        if (typeof loader !== 'function') {
            throw new Error(`Inertia page not found: ${name} (looked for ${key}). Available: ${Object.keys(pages).join(', ')}`);
        }
        return loader();
    },
    setup({ el, App, props }) {
        const root = createRoot(el);
        root.render(
            <TooltipProvider delayDuration={200} skipDelayDuration={300}>
                <App {...props} />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});
