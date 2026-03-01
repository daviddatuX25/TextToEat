import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from '@inertiajs/react';
import PortalLayout from '../Layouts/PortalLayout';
import { OrderListRow } from '../components/staff/OrderListRow';
import { CreateOrderForm } from '../components/staff/CreateOrderForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Dialog';
import { usePortalOrdersLive } from '../hooks/usePortalOrdersLive';
import { LayoutGrid, PanelLeft, StickyNote, ChefHat, UtensilsCrossed, X, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

const ORDERS_VIEW_MODE_KEY = 'ordersViewMode';
const SECTIONS = [
    { key: 'pending', title: 'Pending', ordersKey: 'pending', subtitle: 'New orders', iconKey: 'pending' },
    { key: 'preparing', title: 'Preparing', ordersKey: 'preparing', subtitle: 'In kitchen', iconKey: 'preparing' },
    { key: 'readyOrders', title: 'Ready', ordersKey: 'readyOrders', subtitle: 'Pickup / Delivery', iconKey: 'readyOrders' },
];

const SECTION_ICONS = {
    pending: StickyNote,
    preparing: ChefHat,
    readyOrders: UtensilsCrossed,
};

function OrdersSection({ section, list, activeHighlight, isCompact = false }) {
    const Icon = SECTION_ICONS[section.iconKey];
    return (
        <div
            className={`flex flex-col min-h-0 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/30 overflow-hidden ${isCompact ? 'min-h-[120px]' : 'min-h-[200px] max-h-[calc(100vh-11rem)]'}`}
        >
            <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-surface-200/50 dark:border-surface-700/50 bg-white/80 dark:bg-surface-800/80 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                    {Icon && <Icon className="h-4 w-4 shrink-0 text-surface-500 dark:text-surface-400" aria-hidden />}
                    <div className="min-w-0">
                        <h2 className="text-sm font-bold text-surface-800 dark:text-surface-200 truncate">{section.title}</h2>
                        {section.subtitle && <p className="text-xs text-surface-500 dark:text-surface-400 truncate">{section.subtitle}</p>}
                    </div>
                </div>
                <span className="text-xs font-medium text-surface-500 dark:text-surface-400 tabular-nums shrink-0">
                    {list.length}
                </span>
            </div>
            <div
                className={`flex flex-col gap-2 flex-1 overflow-y-auto p-2 ${isCompact ? '' : 'min-h-0'}`}
                data-scroll-container="1"
            >
                {list.map((order) => {
                    const isHighlight = activeHighlight != null && String(order.id) === String(activeHighlight);
                    return (
                        <div key={order.id} data-order-id={order.id} className={isHighlight ? 'ring-2 ring-primary-500 ring-offset-2 rounded-xl' : ''}>
                            <OrderListRow order={order} isHighlighted={isHighlight} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Pending = new (received). Preparing = confirmed only. Ready = ready for pickup or on the way for delivery.
function groupOrders(orders) {
    const pending = orders.filter((o) => {
        const s = typeof o.status === 'string' ? o.status : o.status?.value ?? 'received';
        return s === 'received';
    });
    const preparing = orders.filter((o) => {
        const s = typeof o.status === 'string' ? o.status : o.status?.value ?? 'received';
        return s === 'confirmed';
    });
    const readyOrders = orders.filter((o) => {
        const s = typeof o.status === 'string' ? o.status : o.status?.value ?? 'received';
        return s === 'ready' || s === 'on_the_way';
    });
    return { pending, preparing, readyOrders };
}

export default function Orders({
    orders = [],
    menuItems = [],
    deliveryAreas = [],
    pickupSlots = [],
    diningMarkers = [],
    diningMarkersUnavailable = [],
    highlight,
}) {
    const [createOpen, setCreateOpen] = useState(() => {
        if (typeof window === 'undefined') return false;
        return new URLSearchParams(window.location.search).get('create') === '1';
    });
    const [viewMode, setViewMode] = useState(() => {
        if (typeof window === 'undefined') return 'columns';
        return window.localStorage?.getItem(ORDERS_VIEW_MODE_KEY) || 'columns';
    });
    const [singleIndex, setSingleIndex] = useState(0);
    const [activeHighlight, setActiveHighlight] = useState(() => (highlight ? String(highlight) : null));
    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && !window.matchMedia('(min-width: 1024px)').matches);
    const swipeRef = useRef({ startX: 0, startY: 0 });
    const highlightTimeoutRef = useRef(null);

    const groups = useMemo(() => groupOrders(orders), [orders]);
    const effectiveViewMode = isMobile ? 'single' : viewMode;

    useEffect(() => {
        const mql = window.matchMedia('(min-width: 1024px)');
        const handler = () => setIsMobile(!mql.matches);
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, []);
    usePortalOrdersLive();

    useEffect(() => {
        if (!highlight) {
            setActiveHighlight(null);
            return;
        }
        setActiveHighlight(String(highlight));

        // In single-column view, automatically switch to the section
        // that contains the highlighted order so it is rendered.
        if (effectiveViewMode === 'single') {
            const sectionIdx = SECTIONS.findIndex((s) =>
                (groups[s.ordersKey] ?? []).some((o) => String(o.id) === String(highlight))
            );
            if (sectionIdx !== -1) setSingleIndex(sectionIdx);
        }
        if (highlightTimeoutRef.current) {
            clearTimeout(highlightTimeoutRef.current);
        }
        highlightTimeoutRef.current = setTimeout(() => {
            setActiveHighlight(null);
        }, 5000);
        return () => {
            if (highlightTimeoutRef.current) {
                clearTimeout(highlightTimeoutRef.current);
            }
        };
    }, [highlight, effectiveViewMode, groups]);

    useEffect(() => {
        if (!activeHighlight) return;
        const handle = window.setTimeout(() => {
            try {
                // Find the visible card element for this highlighted order.
                const candidates = document.querySelectorAll(`[data-order-id="${activeHighlight}"]`);
                let el = null;
                for (const candidate of candidates) {
                    if (candidate.getBoundingClientRect().height > 0) {
                        el = candidate;
                        break;
                    }
                }
                if (!el) return;

                const container = el.closest('[data-scroll-container="1"]');
                const containerOverflow = container ? window.getComputedStyle(container).overflowY : 'none';
                const isScrollable =
                    container instanceof HTMLElement &&
                    (containerOverflow === 'auto' || containerOverflow === 'scroll');

                if (isScrollable) {
                    const containerTop = container.getBoundingClientRect().top;
                    const elTop = el.getBoundingClientRect().top;
                    // Account for the sticky header so the card isn't hidden behind it.
                    const stickyOffset = 60;
                    const targetTop = container.scrollTop + (elTop - containerTop) - stickyOffset;
                    container.scrollTo({ top: Math.max(targetTop, 0), behavior: 'smooth' });
                } else {
                    // Mobile columns (no inner overflow) — let the page scroll.
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            } catch (e) {
                // ignore
            }
        }, 80);
        return () => {
            window.clearTimeout(handle);
        };
    }, [activeHighlight, effectiveViewMode, singleIndex]);

    useEffect(() => {
        if (typeof window !== 'undefined' && viewMode) {
            window.localStorage?.setItem(ORDERS_VIEW_MODE_KEY, viewMode);
        }
    }, [viewMode]);

    const prevSection = useCallback(() => {
        setSingleIndex((i) => Math.max(0, i - 1));
    }, []);

    const nextSection = useCallback(() => {
        setSingleIndex((i) => Math.min(SECTIONS.length - 1, i + 1));
    }, []);

    const SWIPE_THRESHOLD = 50;
    const handleTouchStart = useCallback((e) => {
        swipeRef.current.startX = e.touches[0].clientX;
        swipeRef.current.startY = e.touches[0].clientY;
    }, []);
    const handleTouchEnd = useCallback((e) => {
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const deltaX = swipeRef.current.startX - endX;
        const deltaY = swipeRef.current.startY - endY;
        if (Math.abs(deltaX) >= SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX > 0) nextSection();
            else prevSection();
        }
    }, [nextSection, prevSection]);

    return (
        <PortalLayout>
            <section className="flex flex-col gap-5 animate-fade-in">
                <header className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-surface-900 dark:text-white">Orders</h1>
                        <p className="text-surface-500 dark:text-surface-400 text-sm mt-0.5">
                            <Link href="/portal/orders/completed" className="text-primary-600 dark:text-primary-400 hover:underline">
                                Completed orders →
                            </Link>
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div
                            className="hidden lg:inline-flex rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 p-0.5"
                            role="group"
                            aria-label="View mode"
                        >
                            <button
                                type="button"
                                onClick={() => setViewMode('columns')}
                                aria-label="3 column view"
                                aria-pressed={viewMode === 'columns'}
                                className={`inline-flex items-center justify-center rounded-md p-1.5 transition-colors ${
                                    viewMode === 'columns'
                                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400'
                                        : 'text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700'
                                }`}
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('single')}
                                aria-label="1 column view"
                                aria-pressed={viewMode === 'single'}
                                className={`inline-flex items-center justify-center rounded-md p-1.5 transition-colors ${
                                    viewMode === 'single'
                                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400'
                                        : 'text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700'
                                }`}
                            >
                                <PanelLeft className="h-4 w-4" />
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={() => setCreateOpen(true)}
                            className="inline-flex items-center gap-1.5 bg-primary-600 text-white text-sm font-semibold py-2 px-3.5 rounded-lg hover:bg-primary-700 transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            New order
                        </button>
                    </div>
                </header>

                {orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-6 text-center rounded-xl border border-dashed border-surface-200 dark:border-surface-700">
                        <StickyNote className="h-10 w-10 text-surface-300 dark:text-surface-600 mb-3" />
                        <h3 className="text-base font-semibold text-surface-700 dark:text-surface-300">No orders yet</h3>
                        <p className="text-surface-500 text-sm mt-1">Create an order or wait for new ones to arrive.</p>
                        <button
                            type="button"
                            onClick={() => setCreateOpen(true)}
                            className="mt-4 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                        >
                            Create order
                        </button>
                    </div>
                ) : effectiveViewMode === 'columns' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                        {SECTIONS.map((section) => (
                            <OrdersSection
                                key={section.key}
                                section={section}
                                list={groups[section.ordersKey] || []}
                                activeHighlight={activeHighlight}
                                isCompact={false}
                            />
                        ))}
                    </div>
                ) : (
                    <div
                        className="flex flex-col gap-3 touch-pan-y"
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                        role="region"
                        aria-label="Orders by section, swipe to change"
                    >
                        <div className="flex items-center justify-between gap-2">
                            <button
                                type="button"
                                onClick={prevSection}
                                disabled={singleIndex === 0}
                                aria-label="Previous section"
                                className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 disabled:opacity-40 disabled:pointer-events-none"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <span className="text-sm font-medium text-surface-700 dark:text-surface-300 tabular-nums">
                                {SECTIONS[singleIndex].title} · {singleIndex + 1}/{SECTIONS.length}
                            </span>
                            <button
                                type="button"
                                onClick={nextSection}
                                disabled={singleIndex === SECTIONS.length - 1}
                                aria-label="Next section"
                                className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 disabled:opacity-40 disabled:pointer-events-none"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                        <OrdersSection
                            section={SECTIONS[singleIndex]}
                            list={groups[SECTIONS[singleIndex].ordersKey] || []}
                            activeHighlight={activeHighlight}
                            isCompact={false}
                        />
                    </div>
                )}
            </section>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="relative pr-8">
                        <DialogTitle>Create order</DialogTitle>
                        <button
                            type="button"
                            onClick={() => setCreateOpen(false)}
                            className="absolute right-0 top-0 rounded-lg p-1.5 text-surface-500 hover:text-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800 dark:text-surface-400 dark:hover:text-surface-200"
                            aria-label="Close"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </DialogHeader>
                    <CreateOrderForm
                        menuItems={menuItems}
                        diningMarkers={diningMarkers}
                        diningMarkersUnavailable={diningMarkersUnavailable}
                        deliveryAreas={deliveryAreas}
                        pickupSlots={pickupSlots}
                    />
                </DialogContent>
            </Dialog>
        </PortalLayout>
    );
}
