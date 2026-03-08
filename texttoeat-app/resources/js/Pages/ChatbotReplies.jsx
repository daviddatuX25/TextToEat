import { router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import PortalLayout from '../Layouts/PortalLayout';
import { Card, CardContent, CardHeader } from '../components/ui';
import { Button } from '../components/ui/Button';

/** Collect all key metadata from tree (nodes have keys + optional children). */
function collectKeysFromTree(nodes) {
    if (!Array.isArray(nodes)) return [];
    return nodes.flatMap((node) => [
        ...(node.keys || []),
        ...collectKeysFromTree(node.children || []),
    ]);
}

/** Default open: first root node + main_menu so nested flow is visible. */
function defaultOpenIds(nodes) {
    const ids = new Set();
    const first = nodes?.[0];
    if (first?.id) ids.add(first.id);
    const mainMenu = nodes?.find((n) => n.id === 'main_menu');
    if (mainMenu?.id) ids.add(mainMenu.id);
    return ids;
}

export default function ChatbotReplies({
    locales = {},
    groups = [],
    overrides = {},
    defaults = {},
    optionLabelKeys = [],
}) {
    const { errors } = usePage().props;
    const [locale, setLocale] = useState('en');
    const [values, setValues] = useState({});
    const [saving, setSaving] = useState(null);
    const [resetting, setResetting] = useState(null);
    const keysList = collectKeysFromTree(groups);
    const [openGroupIds, setOpenGroupIds] = useState(() => defaultOpenIds(groups));

    useEffect(() => {
        const next = {};
        collectKeysFromTree(groups).forEach(({ key }) => {
            next[key] = overrides[locale]?.[key] ?? defaults[locale]?.[key] ?? '';
        });
        setValues(next);
    }, [locale, groups, overrides, defaults]);

    const toggleGroup = (id) => {
        setOpenGroupIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleChange = (key, value) => {
        setValues((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = (key) => {
        setSaving(key);
        router.post('/portal/chatbot-replies', {
            key,
            locale,
            value: values[key] ?? '',
        }, {
            preserveScroll: true,
            onFinish: () => setSaving(null),
        });
    };

    const handleReset = (key) => {
        setResetting(key);
        const params = new URLSearchParams({ key, locale });
        router.delete(`/portal/chatbot-replies?${params.toString()}`, {
            preserveScroll: true,
            onSuccess: () => {
                setValues((prev) => ({ ...prev, [key]: defaults[locale]?.[key] ?? '' }));
            },
            onFinish: () => setResetting(null),
        });
    };

    const localeEntries = Object.entries(locales);

    function renderKeyBlocks(keys) {
        if (!keys?.length) return null;
        return keys.map(({ key, label, required_placeholders: requiredPlaceholders }) => {
            const hasOverride = Boolean(overrides[locale]?.[key]);
            const isOptionLabel = optionLabelKeys.includes(key);
            const placeholderHint = requiredPlaceholders?.length > 0
                ? ` Must include: ${requiredPlaceholders.join(', ')}`
                : '';
            return (
                <div
                    key={key}
                    className="space-y-2 p-4 rounded-xl bg-surface-50 dark:bg-surface-800/40 border border-surface-200 dark:border-surface-700"
                >
                    <label className="block text-sm font-semibold text-surface-800 dark:text-surface-200">
                        {label}
                        {isOptionLabel && (
                            <span
                                className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200"
                                title="Option label: appears as choice text (1. X, 2. Y on SMS/Web, or button text on Messenger)"
                            >
                                Option label
                            </span>
                        )}
                        {placeholderHint && (
                            <span className="block text-xs font-normal text-surface-500 dark:text-surface-400 mt-0.5">
                                {placeholderHint}
                            </span>
                        )}
                    </label>
                    <p className="text-xs font-medium text-surface-600 dark:text-surface-400 mt-1">
                        Chatbot response:
                    </p>
                    <textarea
                        value={values[key] ?? ''}
                        onChange={(e) => handleChange(key, e.target.value)}
                        placeholder={defaults[locale]?.[key] ?? ''}
                        rows={3}
                        className="w-full rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary"
                        aria-label="Chatbot response"
                    />
                    <p className="text-xs text-surface-500 dark:text-surface-400">
                        Customer message: Customer replies with options (numbers on SMS/Web, buttons on Messenger) or free text depending on template.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            onClick={() => handleSave(key)}
                            disabled={saving !== null}
                        >
                            {saving === key ? 'Saving…' : 'Save'}
                        </Button>
                        {hasOverride && (
                            <button
                                type="button"
                                onClick={() => handleReset(key)}
                                disabled={resetting !== null}
                                className="rounded-lg border-2 border-surface-300 dark:border-surface-600 px-3 py-1.5 text-sm font-semibold text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors disabled:opacity-50"
                            >
                                {resetting === key ? 'Resetting…' : 'Reset to default'}
                            </button>
                        )}
                    </div>
                </div>
            );
        });
    }

    function TreeNode({ node, depth = 0 }) {
        const isOpen = openGroupIds.has(node.id);
        const hasChildren = Array.isArray(node.children) && node.children.length > 0;
        const hasKeys = Array.isArray(node.keys) && node.keys.length > 0;
        const isEmpty = !hasChildren && !hasKeys;
        const indentClass = depth === 0 ? '' : depth === 1 ? 'ml-4' : depth === 2 ? 'ml-8' : 'ml-12';

        return (
            <div
                key={node.id}
                className={`rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden ${indentClass}`}
            >
                <button
                    type="button"
                    onClick={() => toggleGroup(node.id)}
                    className="w-full flex items-center gap-2 px-4 py-3 text-left bg-surface-50 dark:bg-surface-800/60 hover:bg-surface-100 dark:hover:bg-surface-800 font-semibold text-surface-800 dark:text-surface-200 transition-colors"
                    aria-expanded={isOpen}
                    aria-controls={`group-${node.id}`}
                >
                    {isOpen ? (
                        <ChevronDown className="w-5 h-5 shrink-0 text-surface-500" aria-hidden />
                    ) : (
                        <ChevronRight className="w-5 h-5 shrink-0 text-surface-500" aria-hidden />
                    )}
                    <span>{node.label}</span>
                    {hasKeys && (
                        <span className="text-sm font-normal text-surface-500 dark:text-surface-400">
                            ({node.keys.length})
                        </span>
                    )}
                </button>
                <div
                    id={`group-${node.id}`}
                    role="region"
                    aria-label={node.label}
                    hidden={!isOpen}
                    className="space-y-4 p-4 pt-0 border-t border-surface-200 dark:border-surface-700"
                >
                    {isEmpty && (
                        <p className="text-sm text-surface-500 dark:text-surface-400">No templates in this section.</p>
                    )}
                    {hasKeys && <div className="space-y-4">{renderKeyBlocks(node.keys)}</div>}
                    {hasChildren && (
                        <div className="space-y-4">
                            {node.children.map((child) => (
                                <TreeNode key={child.id} node={child} depth={depth + 1} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <PortalLayout>
            <section className="flex flex-col gap-8 animate-fade-in pt-2 pb-12">
                <header className="space-y-3">
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-surface-900 dark:text-white">
                        Chatbot reply templates
                    </h1>
                    <p className="text-surface-500 dark:text-surface-400 text-sm">
                        Customize reply templates per language. Defaults come from the app; overrides are stored here. Use placeholders like :reference or :summary where shown.
                    </p>
                    <p className="text-surface-500 dark:text-surface-400 text-xs">
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200">Option label</span> = choice text shown as 1. X, 2. Y on SMS/Web, or as button text on Messenger. Customize these for each language.
                    </p>
                    {errors && Object.keys(errors).length > 0 && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                            {Object.entries(errors).map(([field, message]) => (
                                <p key={field}>{message}</p>
                            ))}
                        </div>
                    )}
                </header>

                {localeEntries.length > 0 && (
                    <div className="flex gap-2 border-b border-surface-200 dark:border-surface-700 pb-2">
                        {localeEntries.map(([code, label]) => (
                            <button
                                key={code}
                                type="button"
                                onClick={() => setLocale(code)}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                                    locale === code
                                        ? 'bg-primary-600 text-white dark:bg-primary-500'
                                        : 'bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                )}

                <Card className="rounded-2xl border-surface-200 dark:border-surface-700 overflow-hidden">
                    <CardHeader className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/80 dark:bg-surface-900/40 px-6 py-5">
                        <p className="text-sm font-semibold text-surface-800 dark:text-surface-100">
                            Templates for {locales[locale] ?? locale}
                        </p>
                    </CardHeader>
                    <CardContent className="p-6 sm:p-8 space-y-4">
                        {groups.map((node) => (
                            <TreeNode key={node.id} node={node} depth={0} />
                        ))}
                    </CardContent>
                </Card>
            </section>
        </PortalLayout>
    );
}
