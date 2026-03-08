import { useState, useEffect, useRef } from 'react';
import PortalLayout from '../Layouts/PortalLayout';
import { MessageCircle, Send, Globe, Smartphone } from 'lucide-react';

const CHANNELS = [
    { value: 'web', label: 'Web chat', icon: Globe },
    { value: 'sms', label: 'Simulate SMS', icon: Smartphone },
    { value: 'messenger', label: 'Simulate Messenger', icon: MessageCircle },
];

function getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : null;
}

export default function Chat({ webChatExternalId = '' }) {
    const [channel, setChannel] = useState('web');
    const [externalId, setExternalId] = useState(webChatExternalId || '');
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);
    const initFetched = useRef(false);

    const effectiveExternalId = channel === 'web' ? (webChatExternalId || externalId) : externalId || `web_${Date.now()}`;
    const seenOutboundIds = useRef(new Set());

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        // SMS conversations are user-initiated; skip init hook for sms.
        if (channel === 'sms') {
            setLoading(false);
            return;
        }

        if (initFetched.current) return;
        if (!effectiveExternalId && channel !== 'web') {
            setExternalId(`sim_${channel}_${Date.now()}`);
            return;
        }
        const id = channel === 'web' ? (webChatExternalId || effectiveExternalId) : effectiveExternalId;
        if (!id) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        initFetched.current = true;
        fetch(`/api/chatbot/init?${new URLSearchParams({ channel, external_id: id })}`, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
        })
            .then((r) => {
                if (!r.ok) throw new Error(`Init failed: ${r.status}`);
                return r.json();
            })
            .then((data) => {
                const replies = data.replies ?? (data.reply ? [data.reply] : []);
                const nonEmpty = replies.filter((t) => typeof t === 'string' && t.trim() !== '');
                setMessages(
                    nonEmpty.map((text, i) => ({ role: 'bot', text, id: `init-${i}` }))
                );
            })
            .catch((e) => {
                setError(e.message || 'Failed to load chat');
                setMessages([{ role: 'bot', text: 'Could not load chat. Check console.', id: 'err' }]);
            })
            .finally(() => setLoading(false));
    }, [channel, effectiveExternalId, webChatExternalId]);

    // Poll for proactive outbound messages (SMS/Messenger sim)
    useEffect(() => {
        if (channel !== 'sms' && channel !== 'messenger') return;
        const id = (externalId || '').trim();
        if (!id) return;

        seenOutboundIds.current = new Set();

        const poll = () => {
            fetch(`/api/chatbot/outbound-messages?${new URLSearchParams({ channel, external_id: id })}`, {
                credentials: 'same-origin',
                headers: { Accept: 'application/json' },
            })
                .then((r) => (r.ok ? r.json() : null))
                .then((data) => {
                    if (!data?.messages?.length) return;
                    const byCreated = [...data.messages].sort(
                        (a, b) => new Date(a.created_at) - new Date(b.created_at)
                    );
                    const newOnes = byCreated.filter((m) => !seenOutboundIds.current.has(m.id));
                    if (newOnes.length === 0) return;
                    newOnes.forEach((m) => seenOutboundIds.current.add(m.id));
                    setMessages((prev) => [
                        ...prev,
                        ...newOnes.map((m, i) => ({ role: 'bot', text: m.body, id: `out-${m.id}-${i}` })),
                    ]);
                })
                .catch(() => {});
        };

        poll();
        const interval = setInterval(poll, 2500);
        return () => clearInterval(interval);
    }, [channel, externalId]);

    const sendMessage = (e) => {
        e.preventDefault();
        const text = input.trim();
        if (!text || sending) return;
        if (!effectiveExternalId) {
            setError('Set an external ID when simulating SMS/Messenger.');
            return;
        }

        setInput('');
        setMessages((prev) => [...prev, { role: 'user', text, id: `u-${Date.now()}` }]);
        setSending(true);
        setError(null);

        const csrf = getCsrfToken();
        const headers = {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(csrf && { 'X-CSRF-TOKEN': csrf }),
        };

        fetch('/api/chatbot/webhook', {
            method: 'POST',
            headers,
            credentials: 'same-origin',
            body: JSON.stringify({
                channel,
                external_id: effectiveExternalId,
                body: text,
            }),
        })
            .then((r) => {
                if (!r.ok) return r.json().then((j) => Promise.reject(new Error(j.message || `HTTP ${r.status}`)));
                return r.json();
            })
            .then((data) => {
                const reply = data.reply ?? '';
                const replies = data.replies ?? (reply ? [reply] : []);
                const nonEmpty = replies.filter((t) => typeof t === 'string' && t.trim() !== '');
                if (nonEmpty.length > 0) {
                    setMessages((prev) => [
                        ...prev,
                        ...nonEmpty.map((t, i) => ({ role: 'bot', text: t, id: `b-${Date.now()}-${i}` })),
                    ]);
                }
            })
            .catch((e) => {
                setError(e.message || 'Send failed');
                setMessages((prev) => [
                    ...prev,
                    { role: 'bot', text: `Error: ${e.message || 'Send failed'}`, id: `err-${Date.now()}` },
                ]);
            })
            .finally(() => setSending(false));
    };

    const switchChannel = (newChannel) => {
        setChannel(newChannel);
        if (newChannel !== 'web' && !externalId) {
            setExternalId(`sim_${newChannel}_${Date.now()}`);
        }
        initFetched.current = false;
        setMessages([]);
        setLoading(true);
    };

    return (
        <PortalLayout>
            <section className="flex flex-col gap-6 max-w-2xl mx-auto py-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-surface-900 dark:text-white">
                        Channel Simulator
                    </h1>
                    <p className="text-surface-600 dark:text-surface-400 mt-1">
                        Simulate SMS or Messenger to test the chatbot flow. Use phone number (SMS) or PSID (Messenger).
                    </p>
                </div>

                <div className="rounded-2xl border-2 border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 overflow-hidden flex flex-col min-h-[360px] max-h-[70vh]">
                    <div className="flex flex-wrap items-center gap-2 p-3 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
                        <span className="text-sm font-semibold text-surface-600 dark:text-surface-400">Simulate as:</span>
                        {CHANNELS.map(({ value, label, icon: Icon }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => switchChannel(value)}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                                    channel === value
                                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400 border border-primary-200 dark:border-primary-500/30'
                                        : 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-400 border border-transparent hover:bg-surface-200 dark:hover:bg-surface-600'
                                }`}
                            >
                                <Icon className="h-4 w-4" />
                                {label}
                            </button>
                        ))}
                        {(channel === 'sms' || channel === 'messenger') && (
                            <input
                                type="text"
                                value={externalId}
                                onChange={(e) => setExternalId(e.target.value)}
                                placeholder={channel === 'sms' ? 'Phone number (e.g. 09171234567)' : 'PSID (e.g. from Messenger test tools)'}
                                className="flex-1 min-w-[140px] rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-1.5 text-sm"
                            />
                        )}
                    </div>

                    {error && (
                        <div className="px-4 py-2 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {loading ? (
                            <p className="text-surface-500 dark:text-surface-400 text-sm">Loading…</p>
                        ) : (
                            messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                                            msg.role === 'user'
                                                ? 'bg-primary-600 text-white rounded-br-md'
                                                : 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200 rounded-bl-md'
                                        }`}
                                    >
                                        <span className="whitespace-pre-wrap">{msg.text}</span>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={sendMessage} className="p-3 border-t border-surface-200 dark:border-surface-700 flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type a message…"
                            className="flex-1 rounded-xl border-2 border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            disabled={sending || loading}
                        />
                        <button
                            type="submit"
                            disabled={sending || loading || !input.trim()}
                            className="inline-flex items-center justify-center h-11 w-11 rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                            aria-label="Send"
                        >
                            <Send className="h-5 w-5" />
                        </button>
                    </form>
                </div>
            </section>
        </PortalLayout>
    );
}
