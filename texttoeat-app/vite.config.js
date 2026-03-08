import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    optimizeDeps: {
        include: ['recharts'],
        force: false, // avoid re-bundling deps every run (reduces request churn)
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules/lucide-react')) {
                        return 'lucide';
                    }
                },
            },
        },
    },
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.jsx'],
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    server: {
        host: '0.0.0.0',
        port: 5173,
        hmr: {
            host: 'localhost',
            port: 5173,
        },
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
        warmup: {
            clientFiles: [
                './resources/js/components/ui/Button.jsx',
                './resources/js/components/ui/Card.jsx',
                './resources/js/components/ui/Input.jsx',
                './resources/js/components/ui/SectionHeading.jsx',
                './resources/js/components/ui/StatCard.jsx',
                './resources/js/components/ui/Tooltip.jsx',
                './resources/js/components/ui/InfoTooltip.jsx',
                './resources/js/Layouts/PortalLayout.jsx',
            ],
        },
    },
});
