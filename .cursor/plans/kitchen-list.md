# Work Plan: Kitchen List (Order Queue)

## Overview

Implement the **Kitchen List** feature per TEXTTOEAT_SPECIFICATION.md §12.3 item 3 and §6 Staff Interface: a staff-only order queue that lists orders from the database and allows updating order status (received → confirmed → ready → completed). Scope is orders only: list and update status. Real-time (Echo/polling) is omitted for this iteration unless trivially addable later.

**Key constraints:** No schema/migrations changes. Use existing `Order`, `OrderItem`, `OrderStatus`, `OrderChannel` models and enums. No Today's Menu, Messages, Sales, or chatbot work. Follow existing Laravel + Inertia + Tailwind patterns (Dashboard tabs, `useForm`/`router.put`, flash messages).

**Pattern reference:** Backend mirrors `MenuItemsController` (resource under `/dashboard`, FormRequest for update). Frontend mirrors `Dashboard.jsx` (tab content component, `router.put` for updates, flash success). Dashboard already has a Kitchen List tab at `/dashboard` with placeholder copy; it will be replaced with real order queue UI.

---

## Key Decisions

- **Data source:** Orders are loaded in `DashboardController::index()` and passed to the Dashboard page when the user is on the Kitchen List tab (`/dashboard`). No separate orders index route; the list is part of the dashboard payload.
- **Status updates:** Dedicated `OrdersController` with a single `update()` method that accepts only `status`. Route: `PUT /dashboard/orders/{order}`. Validation via `UpdateOrderStatusRequest` (status in: received, confirmed, ready, completed).
- **UI:** Kitchen List tab shows order cards or table rows with: order reference, channel, customer name/phone, items summary (e.g. "2× Adobo, 1× Sinigang"), current status, and a control (dropdown or buttons) to change status. Follow existing Dashboard styling (Tailwind; no shadcn components required if not already used elsewhere—current Dashboard uses plain HTML/buttons).
- **Real-time:** Omitted. After each status update, `redirect()->back()` refreshes the dashboard and list. Optional polling can be a follow-up iteration.

---

## Files to Create vs Modify

| Action | Path | Purpose |
|--------|------|---------|
| Modify | `backend/app/Http/Controllers/DashboardController.php` | Load orders with `orderItems` and pass `orders` to Inertia when rendering Dashboard. |
| Create | `backend/app/Http/Controllers/OrdersController.php` | `update(UpdateOrderStatusRequest $request, Order $order)` — set `order->status` and redirect back with flash. |
| Create | `backend/app/Http/Requests/UpdateOrderStatusRequest.php` | Validate `status` in `['received','confirmed','ready','completed']`. |
| Modify | `backend/routes/web.php` | Add `Route::put('/dashboard/orders/{order}', [OrdersController::class, 'update'])` inside `auth` middleware group. |
| Modify | `backend/resources/js/Pages/Dashboard.jsx` | Add `KitchenListTab` component; pass `orders` from props; replace placeholder with `<KitchenListTab orders={orders} />` when `tab === 'kitchen'`. Render order ref, channel, customer, items summary, status, and status-update control (e.g. select + `router.put`). |

---

## Tasks

### Task 1: Backend — Load orders in DashboardController and pass to Dashboard

**Description:** In `DashboardController::index()`, query `Order` with `orderItems` relation, order by creation (e.g. `created_at desc`), and pass the result as `orders` to `Inertia::render('Dashboard', [...])`. Ensure serialization exposes `reference`, `channel`, `status`, `customer_name`, `customer_phone`, `total`, and nested `order_items` (e.g. `name`, `quantity`, `price`) so the frontend can show order ref, channel, customer, items summary, and status.

**Files affected:**
- `backend/app/Http/Controllers/DashboardController.php` — Add `Order::with('orderItems')->orderByDesc('created_at')->get()` and include `'orders' => $orders` in the Inertia props. Keep existing `menuItems` and `tab => 'kitchen'`.

**Dependencies:** None.

**Pattern reference:** `MenuItemsController::index()` loading menu items and passing to same Dashboard view; `Order` model and `orderItems()` relation in `backend/app/Models/Order.php`.

**Acceptance criteria:**
```bash
# From project root (backend is backend/)
./vendor/bin/sail php artisan tinker --execute="
  $count = \App\Models\Order::with('orderItems')->count();
  echo 'Orders in DB: ' . $count . PHP_EOL;
"
# Visit GET /dashboard as authenticated user; Inertia payload must include key 'orders' (array). No PHP errors.
./vendor/bin/sail npm run build
# Expected: Exit code 0.
```

---

### Task 2: Backend — UpdateOrderStatusRequest and OrdersController

**Description:** Create a FormRequest that validates `status` as one of `received`, `confirmed`, `ready`, `completed`. Create `OrdersController` with `update(UpdateOrderStatusRequest $request, Order $order)` that sets `$order->status = $request->validated('status')`, saves, and redirects back with a success flash message. Register `PUT /dashboard/orders/{order}` in `web.php` inside the `auth` middleware group.

**Files affected:**
- **Create** `backend/app/Http/Requests/UpdateOrderStatusRequest.php` — `authorize()` return true; `rules()` return `['status' => ['required', 'string', 'in:received,confirmed,ready,completed']]`.
- **Create** `backend/app/Http/Controllers/OrdersController.php` — `update()` as above; use `redirect()->back()->with('success', ...)`.
- `backend/routes/web.php` — Add `use App\Http\Controllers\OrdersController;` and `Route::put('/dashboard/orders/{order}', [OrdersController::class, 'update'])` inside the auth group.

**Dependencies:** None. Can run in parallel with Task 1.

**Pattern reference:** `UpdateMenuItemRequest.php`, `MenuItemsController::update()`, and existing `Route::put('/dashboard/menu-items/{menuItem}', ...)` in `web.php`.

**Acceptance criteria:**
```bash
./vendor/bin/sail php artisan route:list --path=dashboard/orders
# Expected: PUT dashboard/orders/{order} listed and named.

# Update status via tinker or curl (with session cookie / auth):
# PUT /dashboard/orders/1 with body status=confirmed → 302 redirect back, session flash 'success'. Order status in DB is 'confirmed'.
./vendor/bin/sail php artisan tinker --execute="
  $order = \App\Models\Order::first();
  if ($order) { echo 'Order id=' . $order->id . ' status=' . $order->status->value . PHP_EOL; }
"
```

---

### Task 3: Frontend — KitchenListTab component and Dashboard integration

**Description:** In `Dashboard.jsx`, add a `KitchenListTab` component that receives `orders` (default to `[]`). For each order, display: order reference, channel (sms/messenger/web), customer name, customer phone, items summary (e.g. "2× ItemName, 1× OtherItem"), total, and current status. Provide a control to change status (e.g. a `<select>` or button group for received/confirmed/ready/completed) that submits via `router.put(\`/dashboard/orders/${order.id}\`, { status: newStatus })` (and optionally `preserveScroll`). Replace the Kitchen List placeholder (`Order queue — coming next.`) with `<KitchenListTab orders={orders ?? []} />`. Ensure the Dashboard page receives `orders` from props (already passed in Task 1).

**Files affected:**
- `backend/resources/js/Pages/Dashboard.jsx` — Add `KitchenListTab`; in the default Dashboard props add `orders = []`; when `tab === 'kitchen'` render `<KitchenListTab orders={orders} />` instead of the placeholder paragraph.

**Dependencies:** Task 1 (backend must pass `orders` so frontend has data). Task 2 can be in parallel; frontend will call the same PUT route.

**Pattern reference:** `TodayMenuTab` and `MenuItemRow` in same file; `router.put` and flash usage; existing tab conditional rendering. Use existing Tailwind/button styles consistent with the rest of Dashboard.

**Acceptance criteria:**
```bash
./vendor/bin/sail npm run build
# Expected: Exit code 0.

# Manual/automated: Log in, visit /dashboard. Kitchen List tab shows order queue: if no orders, show empty state (e.g. "No orders"); if orders exist, each shows ref, channel, customer, items summary, status, and a working status control. Changing status triggers PUT and redirect back; list reflects new status.
```
- No new lint errors in `Dashboard.jsx` (e.g. from missing props or invalid JSX).

---

### Task 4: Wire status control to PUT and flash feedback

**Description:** Ensure the status change control in `KitchenListTab` uses Inertia's `router.put` to `PUT /dashboard/orders/{order}` with body `{ status: selectedValue }`. Handle success via redirect (page reload with fresh `orders` from server) and display `flash.success` if present (already shown in Dashboard layout). Optionally disable the control or show loading state while the request is in flight.

**Files affected:**
- `backend/resources/js/Pages/Dashboard.jsx` — `KitchenListTab`: on status change, call `router.put(\`/dashboard/orders/${order.id}\`, { status })`; ensure backend returns redirect with flash so success message appears.

**Dependencies:** Task 2 (route and controller), Task 3 (KitchenListTab exists).

**Pattern reference:** `MenuItemRow` using `form.put(\`/dashboard/menu-items/${item.id}\`, { onSuccess: () => setEditing(false) })` and Dashboard displaying `flash?.success`.

**Acceptance criteria:**
```bash
# With at least one order in DB: visit /dashboard, change one order's status via the control. Page redirects; flash message "Order status updated." (or equivalent) appears; order row shows the new status.
./vendor/bin/sail npm run build
# Expected: Exit code 0.
```

---

## Task Dependency Graph

- **Task 1** and **Task 2** have no dependencies and can run in parallel.
- **Task 3** depends on Task 1 (needs `orders` in props).
- **Task 4** depends on Task 2 and Task 3.

Suggested execution order: run Task 1 and Task 2 in parallel; then Task 3; then Task 4.

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Order list large enough to slow initial dashboard load | Medium | Keep query simple with `with('orderItems')`; no N+1. If needed later, add pagination (out of scope for this plan). |
| Frontend expects camelCase vs backend snake_case | Low | Inertia serializes Eloquent to JSON; Laravel typically uses snake_case. If frontend expects camelCase, use Laravel's attribute casting or a resource; otherwise use snake_case in JS (e.g. `order.order_items`). |
| Route model binding for `Order` | Low | Ensure `Route::put('/dashboard/orders/{order}', ...)` uses implicit binding; `Order $order` in controller will resolve. No custom key needed if using `id`. |

---

## Execution Notes

- **Parallel:** Task 1 and Task 2 can be implemented in parallel.
- **Order:** Task 3 after Task 1 (and optionally after Task 2). Task 4 after Tasks 2 and 3.
- **Verification:** After each task: `./vendor/bin/sail npm run build` (exit 0), and task-specific acceptance commands. No schema or migration changes; all work is controller, request, route, and frontend.
- **Real-time:** Intentionally omitted. A later iteration can add a simple polling endpoint (e.g. GET `/dashboard/orders` returning JSON) and a frontend interval to refresh the list if desired.
