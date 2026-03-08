import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, router } from '@inertiajs/react';
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors, useDraggable, useDroppable, pointerWithin } from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import { toast } from 'sonner';
import PortalLayout from '../Layouts/PortalLayout';
import { PageHeader } from '../components/ui';
import { OrderListRow } from '../components/staff/OrderListRow';
import { usePortalOrdersLive } from '../hooks/usePortalOrdersLive';
import { getIncomingOrderToastMessage } from '../utils/orderIncomingToast';
import { filterOrdersBySearch } from '../utils/filterOrdersBySearch';
import { Columns3, Smartphone, StickyNote, ChefHat, UtensilsCrossed, ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react';

const ORDERS_VIEW_MODE_KEY = 'ordersViewMode';
/** Column key → status to send when an order is dropped into that column. Must match backend OrderStatus enum. */
const SECTION_TO_STATUS = {
    pending: 'received',
    preparing: 'preparing',
    readyOrders: 'ready',
};
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

/** Returns the section key (column) this order belongs to based on its status. */
function getOrderColumnKey(order) {
    const s = typeof order.status === 'string' ? order.status : order.status?.value ?? 'received';
    if (s === 'received') return 'pending';
    if (s === 'preparing') return 'preparing';
    if (s === 'ready' || s === 'on_the_way') return 'readyOrders';
    return 'pending';
}

function OrdersSection({ section, list, activeHighlight, isCompact = false, isColumnsView = false }) {
    const Icon = SECTION_ICONS[section.iconKey];
    const { setNodeRef, isOver } = useDroppable({ id: section.key });
    return (
        <div
            className={`flex flex-col min-h-0 rounded-xl border-2 bg-white dark:bg-surface-800/50 shadow-sm overflow-hidden ${isOver ? 'border-primary-400 dark:border-primary-500 ring-2 ring-primary-500/30' : 'border-surface-200 dark:border-surface-600'} ${isCompact ? 'min-h-[120px]' : 'min-h-[200px] max-h-[calc(100vh-11rem)]'}`}
        >
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b-2 border-surface-200 dark:border-surface-600 bg-surface-50/80 dark:bg-surface-800/80 shrink-0">
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
                ref={setNodeRef}
                className={`flex flex-col gap-2 flex-1 overflow-y-auto p-3 ${isCompact ? '' : 'min-h-0'}`}
                data-scroll-container="1"
            >
                {list.map((order) => {
                    const isHighlight = activeHighlight != null && String(order.id) === String(activeHighlight);
                    if (isColumnsView) {
                        return (
                            <DraggableOrderCard key={order.id} order={order} isHighlighted={isHighlight} />
                        );
                    }
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

function DraggableOrderCard({ order, isHighlighted }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: order.id });
    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            data-order-id={order.id}
            className={`rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800/50 p-3 transition-shadow ${isDragging ? 'opacity-0 pointer-events-none' : ''} ${isHighlighted ? 'ring-2 ring-primary-500 ring-offset-2' : ''}`}
        >
            <OrderListRow order={order} isHighlighted={isHighlighted} />
        </div>
    );
}

// Pending = received. Preparing = preparing. Ready = ready or on_the_way.
function groupOrders(orders) {
    const pending = orders.filter((o) => {
        const s = typeof o.status === 'string' ? o.status : o.status?.value ?? 'received';
        return s === 'received';
    });
    const preparing = orders.filter((o) => {
        const s = typeof o.status === 'string' ? o.status : o.status?.value ?? 'received';
        return s === 'preparing';
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
    const [viewMode, setViewMode] = useState(() => {
        if (typeof window === 'undefined') return 'columns';
        return window.localStorage?.getItem(ORDERS_VIEW_MODE_KEY) || 'columns';
    });
    const [singleIndex, setSingleIndex] = useState(0);
    const [activeHighlight, setActiveHighlight] = useState(() => (highlight ? String(highlight) : null));
    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && !window.matchMedia('(min-width: 1024px)').matches);
    const [optimisticStatus, setOptimisticStatus] = useState(() => new Map());
    const [activeId, setActiveId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const swipeRef = useRef({ startX: 0, startY: 0 });
    const highlightTimeoutRef = useRef(null);

    const displayOrders = useMemo(
        () =>
            orders.map((o) =>
                optimisticStatus.has(o.id) ? { ...o, status: optimisticStatus.get(o.id) } : o
            ),
        [orders, optimisticStatus]
    );
    const filteredOrders = useMemo(
        () => filterOrdersBySearch(displayOrders, searchQuery),
        [displayOrders, searchQuery]
    );
    const groups = useMemo(() => groupOrders(filteredOrders), [filteredOrders]);
    const effectiveViewMode = isMobile ? 'single' : viewMode;
    const activeOrder = useMemo(
        () => (activeId != null ? filteredOrders.find((o) => String(o.id) === String(activeId)) : null),
        [activeId, filteredOrders]
    );

    const sensors = useSensors(
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 8,
            },
        }),
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );

    const routerOpts = useCallback(() => ({
        preserveScroll: true,
        onSuccess: (p) => { p?.props?.flash?.error && toast.error(p.props.flash.error); },
        onError: (e) => {
            const m = e?.status ?? e?.message ?? (typeof e === 'string' ? e : null);
            m && toast.error(m);
        },
    }), []);

    const handleDragStart = useCallback((event) => {
        setActiveId(event.active.id);
    }, []);

    const handleDragCancel = useCallback(() => {
        setActiveId(null);
    }, []);

    const handleDragEnd = useCallback(
        (event) => {
            setActiveId(null);
            const { active, over } = event;
            if (!over) return;
            const orderId = active.id;
            const targetSectionKey = over.id;
            const order = orders.find((o) => String(o.id) === String(orderId));
            if (!order) return;
            const currentStatus = optimisticStatus.get(order.id) ?? (typeof order.status === 'string' ? order.status : order.status?.value) ?? 'received';
            const currentColumnKey = getOrderColumnKey({ ...order, status: currentStatus });
            if (currentColumnKey === targetSectionKey) return;
            const newStatus = SECTION_TO_STATUS[targetSectionKey];
            if (!newStatus) return;
            setOptimisticStatus((prev) => new Map(prev).set(orderId, newStatus));
            const opts = routerOpts();
            const clearOptimistic = () =>
                setOptimisticStatus((prev) => {
                    const next = new Map(prev);
                    next.delete(orderId);
                    return next;
                });
            router.put(`/portal/orders/${orderId}`, { status: newStatus }, {
                ...opts,
                onSuccess: (page) => {
                    clearOptimistic();
                    opts.onSuccess?.(page);
                },
                onError: (errors) => {
                    clearOptimistic();
                    opts.onError?.(errors);
                },
            });
        },
        [orders, optimisticStatus, routerOpts]
    );

    useEffect(() => {
        const mql = window.matchMedia('(min-width: 1024px)');
        const handler = () => setIsMobile(!mql.matches);
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, []);
    usePortalOrdersLive({ getIncomingToastMessage: (p) => getIncomingOrderToastMessage('orders', p) });

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
                <PageHeader
                    title="Orders"
                    description="Active orders. Create new or switch to completed."
                >
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative flex-1 min-w-[160px] max-w-[240px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" aria-hidden />
                            <input
                                type="search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search orders…"
                                className="w-full rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 pl-9 pr-3 py-2 text-sm text-surface-800 dark:text-surface-200 placeholder:text-surface-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                aria-label="Search orders"
                            />
                        </div>
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
                                <Columns3 className="h-4 w-4" />
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
                                <Smartphone className="h-4 w-4" />
                            </button>
                        </div>
                        <Link
                            href="/portal/orders/completed"
                            className="text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline py-2"
                        >
                            Completed orders
                        </Link>
                        <Link
                            href="/portal/quick-orders"
                            className="inline-flex items-center gap-1.5 bg-primary-600 text-white text-sm font-semibold py-2 px-3.5 rounded-lg hover:bg-primary-700 transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            New order
                        </Link>
                    </div>
                </PageHeader>

                {displayOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-6 text-center rounded-xl border border-dashed border-surface-200 dark:border-surface-700">
                        <StickyNote className="h-10 w-10 text-surface-300 dark:text-surface-600 mb-3" />
                        <h3 className="text-base font-semibold text-surface-700 dark:text-surface-300">No orders yet</h3>
                        <p className="text-surface-500 text-sm mt-1">Create an order or wait for new ones to arrive.</p>
                        <Link
                            href="/portal/quick-orders"
                            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                        >
                            <Plus className="h-4 w-4" />
                            Create order
                        </Link>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-6 text-center rounded-xl border border-dashed border-surface-200 dark:border-surface-700">
                        <Search className="h-10 w-10 text-surface-300 dark:text-surface-600 mb-3" />
                        <h3 className="text-base font-semibold text-surface-700 dark:text-surface-300">No orders match your search</h3>
                        <p className="text-surface-500 text-sm mt-1">Try a different search term or clear the search box.</p>
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="mt-4 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                        >
                            Clear search
                        </button>
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={pointerWithin}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDragCancel={handleDragCancel}
                    >
                        {effectiveViewMode === 'columns' ? (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
                                {SECTIONS.map((section) => (
                                    <OrdersSection
                                        key={section.key}
                                        section={section}
                                        list={groups[section.ordersKey] || []}
                                        activeHighlight={activeHighlight}
                                        isCompact={false}
                                        isColumnsView
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
                                    isColumnsView={false}
                                />
                            </div>
                        )}
                        <DragOverlay dropAnimation={null} modifiers={[snapCenterToCursor]}>
                            {activeOrder ? (
                                <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800/50 p-3 shadow-lg cursor-grabbing w-[360px]">
                                    <OrderListRow order={activeOrder} isHighlighted={false} />
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                )}
            </section>
        </PortalLayout>
    );
}
