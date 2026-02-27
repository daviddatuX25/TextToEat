import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from '@inertiajs/react';
import PortalLayout from '../Layouts/PortalLayout';
import { OrderListRow } from '../components/staff/OrderListRow';
import { CreateOrderForm } from '../components/staff/CreateOrderForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Dialog';
import { LayoutGrid, PanelLeft, StickyNote, ChefHat, UtensilsCrossed, X, ChevronLeft, ChevronRight } from 'lucide-react';

const ORDERS_VIEW_MODE_KEY = 'ordersViewMode';
const SECTIONS = [
    { key: 'pending', title: 'Pending', ordersKey: 'pending', subtitle: null, iconKey: 'pending' },
    { key: 'preparing', title: 'Preparing', ordersKey: 'preparing', subtitle: null, iconKey: 'preparing' },
    { key: 'readyOrders', title: 'Ready', ordersKey: 'readyOrders', subtitle: 'Go to deliveries / Go to pickup', iconKey: 'readyOrders' },
];

const SECTION_ICONS = {
    pending: StickyNote,
    preparing: ChefHat,
    readyOrders: UtensilsCrossed,
};

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
    const highlightRef = useRef(null);
    const swipeRef = useRef({ startX: 0, startY: 0 });

    const groups = useMemo(() => groupOrders(orders), [orders]);

    useEffect(() => {
        if (highlight && highlightRef.current) {
            highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [highlight]);

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
            <section className="flex flex-col gap-8 animate-fade-in">
                <header className="space-y-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-sm font-semibold tracking-wide text-primary-600 dark:border-primary-500/20 dark:bg-primary-500/10 dark:text-primary-400">
                        <i className="ph-bold ph-list-bullets"></i>
                        Order list
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-surface-900 dark:text-white">Orders</h1>
                        <div className="flex flex-wrap items-center gap-2">
                            <div
                                className="inline-flex rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 p-0.5"
                                role="group"
                                aria-label="View mode"
                            >
                                <button
                                    type="button"
                                    onClick={() => setViewMode('columns')}
                                    aria-label="3 column view"
                                    aria-pressed={viewMode === 'columns'}
                                    className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                                        viewMode === 'columns'
                                            ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400 border border-primary-200 dark:border-primary-500/30'
                                            : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 border border-transparent'
                                    }`}
                                >
                                    <LayoutGrid className="h-4 w-4" aria-hidden />
                                    <span className="sr-only sm:not-sr-only sm:inline">3 columns</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('single')}
                                    aria-label="1 column view"
                                    aria-pressed={viewMode === 'single'}
                                    className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                                        viewMode === 'single'
                                            ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400 border border-primary-200 dark:border-primary-500/30'
                                            : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 border border-transparent'
                                    }`}
                                >
                                    <PanelLeft className="h-4 w-4" aria-hidden />
                                    <span className="sr-only sm:not-sr-only sm:inline">1 column</span>
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCreateOpen(true)}
                                className="inline-flex items-center gap-2 bg-primary-600 text-white font-semibold py-2.5 px-4 rounded-xl hover:bg-primary-700 smooth-hover shadow-md"
                            >
                                <i className="ph-bold ph-lightning"></i>
                                Create order
                            </button>
                        </div>
                    </div>
                </header>

                <Link href="/portal/orders/completed" className="text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline w-fit">
                    View completed orders →
                </Link>

                {orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-surface-200 dark:border-surface-800">
                        <i className="ph-thin ph-receipt text-6xl text-surface-300 dark:text-surface-700 mb-4"></i>
                        <h3 className="text-lg font-bold text-surface-700 dark:text-surface-300">No orders yet</h3>
                        <p className="text-surface-500 text-sm max-w-sm mt-2">Create an order or check back when new orders arrive.</p>
                    </div>
                ) : viewMode === 'columns' ? (
                    <>
                        <div className="hidden lg:grid lg:grid-cols-3 gap-4">
                            {SECTIONS.map((section) => {
                                const list = groups[section.ordersKey] || [];
                                const Icon = SECTION_ICONS[section.iconKey];
                                return (
                                    <div
                                        key={section.key}
                                        className="flex flex-col min-h-0 rounded-2xl border border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/30 p-4 min-h-[200px] max-h-[calc(100vh-12rem)]"
                                    >
                                        <div className="sticky top-0 z-10 -mx-4 -mt-4 px-4 pt-4 pb-3 mb-2 flex items-start justify-between gap-2 rounded-t-2xl bg-surface-50/95 dark:bg-surface-800/95 backdrop-blur-sm border-b border-surface-200/50 dark:border-surface-700/50">
                                            <div>
                                                <h2 className="text-sm font-bold uppercase tracking-wider text-surface-600 dark:text-surface-400">{section.title}</h2>
                                                {section.subtitle && <p className="text-xs text-surface-500 mt-0.5">{section.subtitle}</p>}
                                                <span className="text-xs font-medium text-surface-500">
                                                    {list.length} order{list.length !== 1 ? 's' : ''}
                                                </span>
                                            </div>
                                            {Icon && <Icon className="h-5 w-5 shrink-0 text-surface-400 dark:text-surface-500" aria-hidden />}
                                        </div>
                                        <div className="flex flex-col gap-3 overflow-y-auto min-h-0 flex-1 -mx-4 px-4">
                                            {list.map((order) => {
                                                const isHighlight = String(order.id) === String(highlight);
                                                return (
                                                    <div key={order.id} ref={isHighlight ? highlightRef : null} className={isHighlight ? 'p-2 -m-2' : ''}>
                                                        <OrderListRow order={order} isHighlighted={isHighlight} />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="lg:hidden flex flex-col gap-6">
                            {SECTIONS.map((section) => {
                                const list = groups[section.ordersKey] || [];
                                const Icon = SECTION_ICONS[section.iconKey];
                                return (
                                    <div
                                        key={section.key}
                                        className="flex flex-col min-h-0 rounded-2xl border border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/30 p-4 min-h-[120px]"
                                    >
                                        <div className="sticky top-0 z-10 -mx-4 -mt-4 px-4 pt-4 pb-3 mb-2 flex items-start justify-between gap-2 rounded-t-2xl bg-surface-50/95 dark:bg-surface-800/95 backdrop-blur-sm border-b border-surface-200/50 dark:border-surface-700/50">
                                            <div>
                                                <h2 className="text-sm font-bold uppercase tracking-wider text-surface-600 dark:text-surface-400">{section.title}</h2>
                                                {section.subtitle && <p className="text-xs text-surface-500 mt-0.5">{section.subtitle}</p>}
                                                <span className="text-xs font-medium text-surface-500">
                                                    {list.length} order{list.length !== 1 ? 's' : ''}
                                                </span>
                                            </div>
                                            {Icon && <Icon className="h-5 w-5 shrink-0 text-surface-400 dark:text-surface-500" aria-hidden />}
                                        </div>
                                        <div className="flex flex-col gap-3 -mx-4 px-4">
                                            {list.map((order) => {
                                                const isHighlight = String(order.id) === String(highlight);
                                                return (
                                                    <div key={order.id} ref={isHighlight ? highlightRef : null} className={isHighlight ? 'p-2 -m-2' : ''}>
                                                        <OrderListRow order={order} isHighlighted={isHighlight} />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    (() => {
                        const section = SECTIONS[singleIndex];
                        const list = groups[section.ordersKey] || [];
                        const Icon = SECTION_ICONS[section.iconKey];
                        return (
                            <div
                                className="flex flex-col gap-4 touch-pan-y"
                                onTouchStart={handleTouchStart}
                                onTouchEnd={handleTouchEnd}
                                role="region"
                                aria-label={`${section.title} section, swipe to change`}
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <button
                                            type="button"
                                            onClick={prevSection}
                                            disabled={singleIndex === 0}
                                            aria-label="Previous section"
                                            className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                                        >
                                            <ChevronLeft className="h-5 w-5" aria-hidden />
                                        </button>
                                        <div className="min-w-0" aria-live="polite">
                                            <p className="text-sm font-semibold text-surface-700 dark:text-surface-300 truncate">{section.title}</p>
                                            <p className="text-xs text-surface-500 dark:text-surface-500">
                                                {singleIndex + 1} of {SECTIONS.length}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={nextSection}
                                            disabled={singleIndex === SECTIONS.length - 1}
                                            aria-label="Next section"
                                            className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                                        >
                                            <ChevronRight className="h-5 w-5" aria-hidden />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-col min-h-0 rounded-2xl border border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/30 p-4 min-h-[200px] max-h-[calc(100vh-14rem)] overflow-y-auto">
                                        <div className="sticky top-0 z-10 -mx-4 -mt-4 px-4 pt-4 pb-3 mb-2 flex items-start justify-between gap-2 rounded-t-2xl bg-surface-50/95 dark:bg-surface-800/95 backdrop-blur-sm border-b border-surface-200/50 dark:border-surface-700/50">
                                        <div>
                                            <h2 className="text-sm font-bold uppercase tracking-wider text-surface-600 dark:text-surface-400">{section.title}</h2>
                                            {section.subtitle && <p className="text-xs text-surface-500 mt-0.5">{section.subtitle}</p>}
                                            <span className="text-xs font-medium text-surface-500">
                                                {list.length} order{list.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        {Icon && <Icon className="h-5 w-5 shrink-0 text-surface-400 dark:text-surface-500" aria-hidden />}
                                    </div>
                                    <div className="flex flex-col gap-3 -mx-4 px-4">
                                        {list.map((order) => {
                                            const isHighlight = String(order.id) === String(highlight);
                                            return (
                                                <div key={order.id} ref={isHighlight ? highlightRef : null} className={isHighlight ? 'p-2 -m-2' : ''}>
                                                    <OrderListRow order={order} isHighlighted={isHighlight} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })()
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
