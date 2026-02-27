# Portal routes, dashboard metrics, back nav, and order highlight

**Status:** Plan only — do not implement until executing steps below with intervention.

**Overview:** Move staff routes under `/portal/*`, add PortalLayout with back navigation and metrics-driven dashboard, implement order highlight on Deliveries/Pickup when navigating from Orders, and keep customer routes and layout separate.

---

## Part A: Specification (reference)

### 1. Route separation: `/portal/*` for business

- **Customer (unchanged):** `/`, `/menu`, `/track`, `/chat`, `/checkout`, `/order-confirmation/{reference}`, `/login`. AppLayout with no Dashboard/Orders.
- **Business (new prefix):** All staff routes under `Route::prefix('portal')->middleware('auth')` in `routes/web.php`:
  - `GET /` → dashboard; `GET /orders`, `GET /deliveries`, `GET /pickup`, `GET /menu-items`
  - `POST/PUT/DELETE` menu-items; `PUT /orders/{order}`; `PATCH /orders/{order}/pickup-slot`
- **Redirects (301):** `/dashboard` → `/portal`, `/dashboard/orders` → `/portal/orders`, `/dashboard/deliveries` → `/portal/deliveries`, `/dashboard/pickup` → `/portal/pickup`, `/dashboard/menu-items` → `/portal/menu-items`, `/orders` → `/portal/orders`, `/deliveries` → `/portal/deliveries`, `/pickup` → `/portal/pickup`, `/menu-items` → `/portal/menu-items`.
- **LoginController:** Post-login redirect from `intended('/dashboard')` to `intended('/portal')`.

### 2. PortalLayout and back navigation

- New `resources/js/Layouts/PortalLayout.jsx`: portal nav (Dashboard `/portal`, Orders `/portal/orders`), Back button (`history.back()` with `router.visit('/portal')` fallback), responsive (including mobile).
- All portal pages use PortalLayout; customer pages use AppLayout with no portal links.

### 3. Dashboard: quick actions + metrics

- Remove large "Order Management" title and "What are you doing?"; content = quick actions + metrics.
- Quick action links: `/portal/orders`, `/portal/deliveries`, `/portal/pickup`, `/portal/menu-items`.
- Metrics: orders_today, ready_delivery, ready_pickup, completed_today (DashboardController passes `metrics`).

### 4. Order highlight on Deliveries and Pickup

- OrderListRow: "Go to deliveries" → `/portal/deliveries?highlight=${order.id}`; "Go to pickup area" → `/portal/pickup?highlight=${order.id}`.
- DeliveriesController and PickupController: pass `highlight` from request to Inertia.
- DeliveryOrderCard and PickupOrderRow: accept highlight prop; apply circulating border animation; optional scroll into view.

### 5. Update all portal links and forms

- Every staff href and form action (router.put, router.patch) uses `/portal/...` and, where applicable, `?highlight=...`.

---

## Part B: Execution with intervention

Execute in order. After each step, **stop and verify** (build, manual check, or tests) before continuing.

### Step 1: Backend — portal prefix and redirects

**Do:**

- In `routes/web.php`, add `Route::prefix('portal')->middleware('auth')->group(...)` containing all current staff GET/POST/PUT/PATCH/DELETE routes (dashboard → index at `/`, orders, deliveries, pickup, menu-items, order update, pickup-slot).
- Add 301 redirects for: `/dashboard`, `/dashboard/orders`, `/dashboard/deliveries`, `/dashboard/pickup`, `/dashboard/menu-items`, `/orders`, `/deliveries`, `/pickup`, `/menu-items` to the corresponding `/portal` or `/portal/...` path.
- In `app/Http/Controllers/Auth/LoginController.php`, change post-login redirect from `intended('/dashboard')` to `intended('/portal')`.

**Deliverable:** Staff routes live under `/portal`; old URLs redirect; login sends to `/portal`.

**Intervention:** Visit `/login`, log in, confirm redirect to `/portal`. Visit `/dashboard` and `/orders`, confirm 301 to `/portal` and `/portal/orders`. Do not proceed until verified.

---

### Step 2: PortalLayout and AppLayout split

**Do:**

- Create `resources/js/Layouts/PortalLayout.jsx` with portal nav (Dashboard, Orders), Back button (history.back + /portal fallback), same shell as AppLayout (brand, main content), responsive + mobile.
- Update `resources/js/Layouts/AppLayout.jsx` so Dashboard/Orders links are not shown (customer-only nav).
- In Dashboard, Orders, Deliveries, PickupCounter, MenuItems: switch from AppLayout to PortalLayout.

**Deliverable:** Portal pages use PortalLayout with Back; customer pages use AppLayout without portal links.

**Intervention:** Load `/portal` and a customer page (e.g. `/menu`). Confirm nav and Back behavior; confirm no portal links on customer pages. Then proceed.

---

### Step 3: Dashboard — metrics and quick actions

**Do:**

- In `app/Http/Controllers/DashboardController.php`, compute metrics (orders_today, ready_delivery, ready_pickup, completed_today) for today and pass `metrics` to Inertia.
- In `resources/js/Pages/Dashboard.jsx`: use PortalLayout; remove large title and "What are you doing?"; add metrics area (cards or strip); set QUICK_ACTIONS hrefs to `/portal/orders`, `/portal/deliveries`, `/portal/pickup`, `/portal/menu-items`.

**Deliverable:** Dashboard shows quick actions + metrics only; no prior screen.

**Intervention:** Open `/portal` after login; confirm metrics and quick action links. Then proceed.

---

### Step 4: All portal links and form actions to /portal

**Do:**

- In `OrderListRow.jsx`: "Go to deliveries" → `/portal/deliveries?highlight=${order.id}`; "Go to pickup area" → `/portal/pickup?highlight=${order.id}`.
- In `Orders.jsx`: "Clear filters" and `applyFilters` router.get → `/portal/orders` with same query params.
- In `Deliveries.jsx`: "Active only" / "Show completed" → `/portal/deliveries` and `/portal/deliveries?show_completed=1`; preserve `highlight` in query when building links if desired.
- In `MenuItems.jsx`: any "Back" or dashboard link → `/portal`.
- In `DeliveryOrderCard.jsx`: `router.put(...)` → `/portal/orders/${order.id}`.
- In `PickupBoard.jsx` (PickupOrderRow): PATCH → `/portal/orders/${order.id}/pickup-slot`.

**Deliverable:** No remaining staff links or form actions point to `/dashboard`, `/orders`, `/deliveries`, `/pickup`, `/menu-items` without `/portal`.

**Intervention:** Click through portal (orders, deliveries, pickup, menu-items); confirm no 404s and correct URLs. Then proceed.

---

### Step 5: Highlight — backend and props

**Do:**

- In `app/Http/Controllers/DeliveriesController.php` index: `$highlight = $request->get('highlight')`; pass `'highlight' => $highlight` to Inertia.
- In `app/Http/Controllers/PickupController.php` index: same.

**Deliverable:** Deliveries and Pickup pages receive `highlight` in props.

**Intervention:** Visit `/portal/deliveries?highlight=1` and `/portal/pickup?highlight=1` (use a real order id if needed); confirm no errors. Then proceed.

---

### Step 6: Highlight — UI animation and optional scroll

**Do:**

- Add a shared highlight style (e.g. CSS class or small component): circulating gradient border animation.
- In `DeliveryOrderCard.jsx`: accept `isHighlighted`; when true, apply highlight; optional ref + scrollIntoView in parent.
- In `Deliveries.jsx`: pass `isHighlighted={order.id == highlight}` to each card; optional useEffect + ref to scroll highlighted card into view.
- In `PickupBoard.jsx` (PickupOrderRow): accept `highlight` or `isHighlighted`; apply same highlight to matching row.
- In `PickupCounter.jsx`: pass `highlight` to rows; optional scroll into view for highlighted order.
- Optionally clear highlight after a few seconds (local state + timeout).

**Deliverable:** Clicking "Go to deliveries" or "Go to pickup area" from Orders opens the right page with that order highlighted (and optionally scrolled into view).

**Intervention:** From `/portal/orders`, click "Go to deliveries" / "Go to pickup area" for one order; confirm URL has `highlight=` and the card/row is visually highlighted. Then proceed.

---

### Step 7: Final checks

**Do:**

- Run `./vendor/bin/sail npm run build` and `./vendor/bin/sail test`.
- Manually: customer routes show no portal nav; portal Back works from subpages and from `/portal` with no history; old URLs redirect; login → `/portal`.

**Deliverable:** Build and tests pass; manual checklist satisfied.

**Intervention:** Sign off or fix any failures before closing the task.

---

## File checklist (summary)

| File | Action |
|------|--------|
| `routes/web.php` | Portal prefix group; 301 redirects |
| `app/Http/Controllers/Auth/LoginController.php` | intended('/portal') |
| `resources/js/Layouts/PortalLayout.jsx` | New layout |
| `resources/js/Layouts/AppLayout.jsx` | Remove portal nav for customer |
| `resources/js/Pages/Dashboard.jsx` | PortalLayout; metrics; quick actions to /portal |
| `app/Http/Controllers/DashboardController.php` | Pass metrics |
| `resources/js/Pages/Orders.jsx` | PortalLayout; links to /portal/orders |
| `resources/js/Pages/Deliveries.jsx` | PortalLayout; links; pass highlight to cards; optional scroll |
| `resources/js/Pages/PickupCounter.jsx` | PortalLayout; pass highlight; optional scroll |
| `resources/js/Pages/MenuItems.jsx` | PortalLayout; back to /portal |
| `resources/js/components/staff/OrderListRow.jsx` | hrefs with /portal and ?highlight= |
| `resources/js/components/staff/DeliveryOrderCard.jsx` | isHighlighted; animation; PUT /portal/orders/... |
| `resources/js/components/staff/PickupBoard.jsx` | highlight/isHighlighted; PATCH /portal/orders/.../pickup-slot |
| `app/Http/Controllers/DeliveriesController.php` | Pass highlight |
| `app/Http/Controllers/PickupController.php` | Pass highlight |
