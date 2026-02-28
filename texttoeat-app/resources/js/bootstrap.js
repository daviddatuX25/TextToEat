import axios from 'axios';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.axios = axios;
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

window.Pusher = Pusher;

const broadcaster = import.meta.env.VITE_BROADCAST_BROADCASTER ?? 'reverb';
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';

if (broadcaster === 'pusher') {
    window.Echo = new Echo({
        broadcaster: 'pusher',
        key: import.meta.env.VITE_PUSHER_APP_KEY,
        cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER ?? 'mt1',
        forceTLS: true,
        authEndpoint: '/broadcasting/auth',
        auth: {
            headers: { 'X-CSRF-TOKEN': csrfToken },
        },
    });
} else if (broadcaster === 'reverb') {
    const reverbKey = import.meta.env.VITE_REVERB_APP_KEY ?? 'texttoeat-key';
    const reverbHost = import.meta.env.VITE_REVERB_HOST ?? window.location.hostname;
    const reverbPort = import.meta.env.VITE_REVERB_PORT ?? 8080;
    const reverbScheme = import.meta.env.VITE_REVERB_SCHEME ?? 'http';
    window.Echo = new Echo({
        broadcaster: 'reverb',
        key: reverbKey,
        wsHost: reverbHost,
        wsPort: reverbPort,
        wssPort: reverbPort,
        forceTLS: reverbScheme === 'https',
        enabledTransports: ['ws', 'wss'],
        authEndpoint: '/broadcasting/auth',
        auth: {
            headers: { 'X-CSRF-TOKEN': csrfToken },
        },
    });
} else {
    window.Echo = null;
}
