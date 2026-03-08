import { router, usePage } from '@inertiajs/react';
import { useEffect, useState, useRef } from 'react';
import {
    ChevronRight,
    Pencil,
    Hand,
    Menu,
    BookOpen,
    ShoppingCart,
    MapPin,
    Check,
    CheckCircle,
    Search,
    User,
    HelpCircle,
    List,
    FileText,
} from 'lucide-react';
import PortalLayout from '../Layouts/PortalLayout';
import { TypewriterText } from '../components/ui';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '../components/ui/Dialog';
import { Button } from '../components/ui/Button';

const GROUP_ICONS = {
    start: Hand,
    main_menu: Menu,
    menu_ordering: BookOpen,
    cart: ShoppingCart,
    delivery_name: MapPin,
    confirm: Check,
    order_placed: CheckCircle,
    track: Search,
    human_takeover: User,
    help_errors: HelpCircle,
    order_flow: List,
    other: FileText,
};

/** Flatten tree into display order (depth-first). */
function flattenGroups(nodes) {
    if (!Array.isArray(nodes)) return [];
    const out = [];
    for (const node of nodes) {
        out.push(node);
        if (Array.isArray(node.children) && node.children.length > 0) {
            out.push(...flattenGroups(node.children));
        }
    }
    return out;
}

/** Badge type from key and group: prompt (blue), option (purple), suffix (gray). */
function getBadgeType(key, groupLabel, optionLabelKeys) {
    if (optionLabelKeys.includes(key)) return 'option';
    const label = (groupLabel || '').toLowerCase();
    const keyLower = (key || '').toLowerCase();
    if (label.includes('suffix') || keyLower.includes('suffix')) return 'suffix';
    return 'prompt';
}

/** Build conversation turns: prompt/suffix keys as bot turns, option keys attached to previous bot turn; customer turn at end. */
function buildTurns(keys, optionLabelKeys) {
    const turns = [];
    let current = null;
    for (const meta of keys || []) {
        const { key } = meta;
        if (optionLabelKeys.includes(key)) {
            if (current) current.optionKeys.push(meta);
            else {
                current = { type: 'bot', promptKey: null, optionKeys: [meta] };
                turns.push(current);
            }
        } else {
            current = { type: 'bot', promptKey: meta, optionKeys: [] };
            turns.push(current);
        }
    }
    if (turns.length > 0) turns.push({ type: 'customer' });
    return turns;
}

/** Default open: first group. */
function defaultOpenIds(flatGroups) {
    const first = flatGroups?.[0];
    return first?.id ? new Set([first.id]) : new Set();
}

/** Card-like badge for placeholder tokens (e.g. :summary, :reference). */
function PlaceholderBadge({ token }) {
    return (
        <span className="inline-flex items-center px-2 py-1 rounded-md border border-surface-300 dark:border-surface-600 bg-surface-100 dark:bg-surface-800 font-mono text-xs font-medium text-surface-700 dark:text-surface-300">
            {token}
        </span>
    );
}

/** Check if value is missing any required placeholder. */
function missingPlaceholders(value, required = []) {
    if (!Array.isArray(required) || required.length === 0) return [];
    return required.filter((p) => !(value || '').includes(p));
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
    const [resetConfirm, setResetConfirm] = useState(null);
    const [openGroupIds, setOpenGroupIds] = useState(() => defaultOpenIds(flattenGroups(groups)));
    const [openOptionEditor, setOpenOptionEditor] = useState(null);
    const flatGroups = flattenGroups(groups);

    useEffect(() => {
        const next = {};
        flattenGroups(groups).forEach((node) => {
            (node.keys || []).forEach(({ key }) => {
                next[key] = overrides[locale]?.[key] ?? defaults[locale]?.[key] ?? '';
            });
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
        router.post('/portal/chatbot-replies', { key, locale, value: values[key] ?? '' }, { preserveScroll: true, onFinish: () => setSaving(null) });
    };

    const handleReset = (key) => {
        setResetting(key);
        setResetConfirm(null);
        const params = new URLSearchParams({ key, locale });
        router.delete(`/portal/chatbot-replies?${params.toString()}`, {
            preserveScroll: true,
            onSuccess: () => {
                setValues((prev) => ({ ...prev, [key]: defaults[locale]?.[key] ?? '' }));
            },
            onFinish: () => setResetting(null),
        });
    };

    const openOption = (groupId, key) => {
        setOpenOptionEditor((prev) => (prev?.groupId === groupId && prev?.key === key ? null : { groupId, key }));
    };

    const localeEntries = Object.entries(locales);

    return (
        <PortalLayout>
            <section className="flex flex-col gap-6 animate-fade-in pt-2 pb-12 max-w-[54rem]">
                <header className="space-y-3">
                    <p className="text-xs font-semibold tracking-wide uppercase text-surface-500 dark:text-surface-400">Portal · Admin</p>
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-surface-900 dark:text-white leading-tight">
                        Reply <em className="italic text-primary-600 dark:text-primary-400">Templates</em>
                    </h1>
                    <p className="text-surface-500 dark:text-surface-400 text-sm">
                        <TypewriterText text="Edit what the chatbot says at each step. Changes apply per language. Options marked Option become buttons on Messenger and numbered choices on SMS/Web — numbering is added automatically." />
                    </p>
                </header>

                {errors && Object.keys(errors).length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                        {Object.entries(errors).map(([field, message]) => (
                            <p key={field}>{message}</p>
                        ))}
                    </div>
                )}

                {localeEntries.length > 0 && (
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-surface-500 dark:text-surface-400">Language:</span>
                        <div className="flex gap-0.5 p-0.5 rounded-lg bg-surface-200 dark:bg-surface-700">
                            {localeEntries.map(([code, label]) => (
                                <button
                                    key={code}
                                    type="button"
                                    onClick={() => setLocale(code)}
                                    className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                                        locale === code
                                            ? 'bg-white dark:bg-surface-800 text-surface-900 dark:text-white shadow-sm'
                                            : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    {flatGroups.map((node) => {
                        const isOpen = openGroupIds.has(node.id);
                        const keys = node.keys || [];
                        const turns = buildTurns(keys, optionLabelKeys);
                        const keyCount = keys.length;
                        const IconComponent = GROUP_ICONS[node.id] || FileText;

                        return (
                            <div
                                key={node.id}
                                className={`reply-flow-group bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl ${isOpen ? 'open' : ''}`}
                            >
                                <button
                                    type="button"
                                    onClick={() => toggleGroup(node.id)}
                                    className="reply-flow-header w-full flex items-center gap-3 px-4 py-3.5 hover:bg-surface-100 dark:hover:bg-surface-700/50 transition-colors text-left border-b border-transparent rounded-t-xl"
                                >
                                    <span className="w-10 h-10 rounded-lg bg-surface-100 dark:bg-surface-700 flex items-center justify-center flex-shrink-0 text-surface-600 dark:text-surface-400">
                                        <IconComponent className="h-5 w-5" strokeWidth={2} />
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-base font-semibold text-surface-900 dark:text-white">{node.label}</div>
                                        <div className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">{(node.children?.length && 'Section') || 'Templates in this flow'}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-mono text-surface-500 dark:text-surface-400 bg-surface-100 dark:bg-surface-700 px-2.5 py-1 rounded-full border border-surface-200 dark:border-surface-600">
                                            {keyCount} key{keyCount !== 1 ? 's' : ''}
                                        </span>
                                        <ChevronRight className="reply-chevron h-5 w-5 text-surface-500 dark:text-surface-400 flex-shrink-0 transition-transform" />
                                    </div>
                                </button>

                                <div className="reply-flow-body">
                                    <div className="px-5 py-5 flex flex-col gap-0">
                                        {turns.length === 0 && (
                                            <p className="text-base text-surface-500 dark:text-surface-400">No templates in this section.</p>
                                        )}
                                        {turns.map((turn, turnIdx) => {
                                            if (turn.type === 'customer') {
                                                const prev = turns[turnIdx - 1];
                                                const optionCount = prev?.optionKeys?.length ?? 0;
                                                const hint = optionCount > 0
                                                    ? `Taps button or types "${Array.from({ length: optionCount }, (_, i) => i + 1).join('", "')}"`
                                                    : 'Customer replies';
                                                return (
                                                    <div key={`customer-${turnIdx}`} className="reply-turn flex justify-end pl-10 mt-4">
                                                        <div>
                                                            <div className="text-xs font-semibold tracking-wider uppercase text-surface-500 dark:text-surface-400 text-right mb-1">Customer replies</div>
                                                            <div className="bg-surface-100 dark:bg-surface-700 border border-surface-300 dark:border-surface-600 rounded-xl rounded-br rounded-tr-md py-2 px-3 text-sm text-surface-600 dark:text-surface-400 italic max-w-[220px]">
                                                                {hint}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            const promptMeta = turn.promptKey;
                                            const optionKeys = turn.optionKeys || [];
                                            const isOptionOnly = !promptMeta && optionKeys.length > 0;

                                            return (
                                                <div key={`bot-${turnIdx}-${promptMeta?.key || optionKeys.map((o) => o.key).join('-')}`} className="reply-turn">
                                                    {promptMeta && (
                                                        <BotTurn
                                                            keyMeta={promptMeta}
                                                            groupLabel={node.label}
                                                            optionLabelKeys={optionLabelKeys}
                                                            value={values[promptMeta.key] ?? ''}
                                                            hasOverride={Boolean(overrides[locale]?.[promptMeta.key])}
                                                            defaultVal={defaults[locale]?.[promptMeta.key] ?? ''}
                                                            saving={saving === promptMeta.key}
                                                            resetting={resetting === promptMeta.key}
                                                            onChange={(v) => handleChange(promptMeta.key, v)}
                                                            onSave={() => handleSave(promptMeta.key)}
                                                            onResetClick={() => setResetConfirm({ key: promptMeta.key, locale })}
                                                            onResetConfirm={() => { handleReset(promptMeta.key); setResetConfirm(null); }}
                                                        />
                                                    )}
                                                    {optionKeys.length > 0 && (
                                                        <>
                                                            <div className="flex flex-wrap gap-1.5 mt-1.5 pl-8">
                                                                {optionKeys.map((opt, idx) => (
                                                                    <button
                                                                        key={opt.key}
                                                                        type="button"
                                                                        onClick={() => openOption(node.id, opt.key)}
                                                                        className="inline-flex items-center gap-2 py-2 px-3 rounded-lg border-2 border-dashed border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-950/30 hover:border-solid transition-all"
                                                                    >
                                                                        <span className="font-mono text-xs text-surface-500 dark:text-surface-400 bg-white dark:bg-surface-800 px-1.5 py-0.5 rounded border border-surface-200 dark:border-surface-600">
                                                                            {idx + 1}
                                                                        </span>
                                                                        <span className="text-sm font-medium text-primary-700 dark:text-primary-400">
                                                                            {values[opt.key] || '—'}
                                                                        </span>
                                                                        <Pencil className="h-4 w-4 text-surface-500 dark:text-surface-400" />
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            {optionKeys.map((opt) => (
                                                                <div
                                                                    key={opt.key}
                                                                    className={`reply-option-editor mt-2 pl-8 ${openOptionEditor?.groupId === node.id && openOptionEditor?.key === opt.key ? 'open' : ''}`}
                                                                >
                                                                    <OptionField
                                                                        keyMeta={opt}
                                                                        value={values[opt.key] ?? ''}
                                                                        saving={saving === opt.key}
                                                                        onChange={(v) => handleChange(opt.key, v)}
                                                                        onSave={() => handleSave(opt.key)}
                                                                        optionIndex={optionKeys.findIndex((o) => o.key === opt.key) + 1}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {resetConfirm && (
                <ResetConfirmDialog
                    key={resetConfirm.key}
                    keyName={resetConfirm.key}
                    locale={resetConfirm.locale}
                    before={overrides[resetConfirm.locale]?.[resetConfirm.key] ?? ''}
                    after={defaults[resetConfirm.locale]?.[resetConfirm.key] ?? ''}
                    onConfirm={() => { handleReset(resetConfirm.key); setResetConfirm(null); }}
                    onCancel={() => setResetConfirm(null)}
                />
            )}
        </PortalLayout>
    );
}

function BotTurn({
    keyMeta,
    groupLabel,
    optionLabelKeys,
    value,
    hasOverride,
    defaultVal,
    saving,
    resetting,
    onChange,
    onSave,
    onResetClick,
}) {
    const badgeType = getBadgeType(keyMeta.key, groupLabel, optionLabelKeys);
    const textareaRef = useRef(null);
    const missing = missingPlaceholders(value, keyMeta.required_placeholders);

    useEffect(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = 'auto';
        ta.style.height = `${ta.scrollHeight}px`;
    }, [value]);

    const badgeClass = {
        prompt: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
        option: 'bg-primary-100 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800',
        suffix: 'bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-400 border border-surface-300 dark:border-surface-600',
    }[badgeType];

    const hintContent = keyMeta.required_placeholders?.length ? (
        <span className="flex flex-wrap items-center gap-1.5">
                            Must include:
                            {(keyMeta.required_placeholders || []).map((p) => (
                                <PlaceholderBadge key={p} token={p} />
                            ))}
                        </span>
    ) : (
        'Do not add numbers — options below are appended automatically for SMS/Web.'
    );

    return (
        <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full bg-primary-600 dark:bg-primary-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0 mt-0.5">T</div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="text-sm font-semibold text-surface-600 dark:text-surface-400">Bot says</span>
                    <span className={`text-xs font-semibold tracking-wide uppercase px-2 py-1 rounded ${badgeClass}`}>
                        {badgeType === 'option' ? 'Option' : badgeType === 'suffix' ? 'Suffix' : 'Prompt'}
                    </span>
                    {hasOverride && (
                        <span className="text-xs font-semibold tracking-wide uppercase px-2 py-1 rounded bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 border border-primary-200 dark:border-primary-800">
                            Modified
                        </span>
                    )}
                </div>
                <div className={`rounded-lg overflow-hidden border transition-colors ${hasOverride ? 'border-primary-500 dark:border-primary-500' : 'border-surface-200 dark:border-surface-600'}`}>
                    <div className="flex items-center gap-2 py-2 px-3 bg-surface-100 dark:bg-surface-700 border-b border-surface-200 dark:border-surface-600">
                        <span className="font-mono text-xs text-surface-500 dark:text-surface-400">{keyMeta.key}</span>
                        <span className="text-sm text-surface-600 dark:text-surface-400 font-medium">— {keyMeta.label}</span>
                    </div>
                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={defaultVal}
                        rows={1}
                        className="w-full border-0 bg-transparent p-3 text-sm text-surface-900 dark:text-white placeholder:text-surface-500 resize-none min-h-[2.5rem] focus:outline-none focus:ring-0"
                    />
                    <div className="flex items-center justify-between gap-3 py-2 px-3 border-t border-surface-200 dark:border-surface-600 bg-surface-100 dark:bg-surface-700 flex-wrap">
                        <span className="text-sm text-surface-500 dark:text-surface-400 italic flex-1 min-w-0">
                            {hintContent}
                        </span>
                        <div className="flex gap-2 flex-shrink-0">
                            <Button className="px-3 py-2 text-sm" onClick={onSave} disabled={saving || resetting}>
                                {saving ? 'Saving…' : 'Save'}
                            </Button>
                            {hasOverride && (
                                <button
                                    type="button"
                                    onClick={onResetClick}
                                    disabled={resetting}
                                    className="px-3 py-2 rounded-lg text-sm font-semibold border border-surface-400 dark:border-surface-500 text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white transition-colors disabled:opacity-50"
                                >
                                    {resetting ? 'Resetting…' : 'Reset'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                {missing.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                        <span>Must include</span>
                        {missing.map((p) => (
                            <PlaceholderBadge key={p} token={p} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function OptionField({ keyMeta, value, saving, onChange, onSave, optionIndex }) {
    const textareaRef = useRef(null);

    useEffect(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = 'auto';
        ta.style.height = `${ta.scrollHeight}px`;
    }, [value]);

    return (
        <div className="rounded-lg overflow-hidden border border-surface-200 dark:border-surface-600">
            <div className="flex items-center gap-2 py-2 px-3 bg-surface-100 dark:bg-surface-700 border-b border-surface-200 dark:border-surface-600">
                <span className="text-xs font-semibold tracking-wide uppercase px-2 py-1 rounded bg-primary-100 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
                    Option
                </span>
                <span className="font-mono text-xs text-surface-500 dark:text-surface-400">{keyMeta.key}</span>
            </div>
            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                rows={1}
                className="w-full border-0 bg-transparent p-3 text-sm text-surface-900 dark:text-white resize-none min-h-[2.5rem] focus:outline-none focus:ring-0"
            />
            <div className="flex items-center justify-between gap-3 py-2 px-3 border-t border-surface-200 dark:border-surface-600 bg-surface-100 dark:bg-surface-700 flex-wrap">
                <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs py-1 px-2.5 rounded-full border bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />SMS: &quot;{optionIndex}. {value || '…'}&quot;
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs py-1 px-2.5 rounded-full border bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />Web: &quot;{optionIndex}. {value || '…'}&quot;
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs py-1 px-2.5 rounded-full border bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-400 border-primary-200 dark:border-primary-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />Messenger: button
                    </span>
                </div>
                <Button className="px-3 py-2 text-sm flex-shrink-0" onClick={onSave} disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                </Button>
            </div>
        </div>
    );
}

function ResetConfirmDialog({ keyName, locale, before, after, onConfirm, onCancel }) {
    return (
        <Dialog open={true} onOpenChange={(open) => { if (!open) onCancel(); }}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Reset to default?</DialogTitle>
                    <DialogDescription>
                        This will remove your override for <code className="font-mono text-xs bg-surface-100 dark:bg-surface-800 px-1 rounded">{keyName}</code> ({locale}) and restore the default text.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 text-sm">
                    <div>
                        <p className="font-medium text-surface-500 dark:text-surface-400 mb-1">Current (override)</p>
                        <pre className="p-3 rounded-lg bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-600 whitespace-pre-wrap break-words text-surface-900 dark:text-white">
                            {before || '(empty)'}
                        </pre>
                    </div>
                    <div>
                        <p className="font-medium text-surface-500 dark:text-surface-400 mb-1">After reset (default)</p>
                        <pre className="p-3 rounded-lg bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-600 whitespace-pre-wrap break-words text-surface-900 dark:text-white">
                            {after || '(empty)'}
                        </pre>
                    </div>
                </div>
                <DialogFooter className="flex-row justify-end gap-2 sm:justify-end">
                    <Button variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button onClick={onConfirm}>Confirm Reset</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
