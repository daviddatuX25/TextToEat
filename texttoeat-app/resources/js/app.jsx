import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';

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
        root.render(<App {...props} />);
    },
    progress: {
        color: '#4B5563',
    },
});
