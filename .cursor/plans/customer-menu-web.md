# Work Plan: Customer Menu (Web)

## Overview

Implement the **Customer menu (web)** feature per TEXTTOEAT_SPECIFICATION.md §12.3 item 5 and §4/§6: a public (guest) page showing today's menu from `menu_items`; the customer can add items to a cart, then checkout to create an order with `channel=web`. No auth is required for browsing or ordering. The plan reuses the existing `Order`, `OrderItem`, `MenuItem`, `OrderStatus`, and `OrderChannel` models and today-scoped menu logic already used in `MenuItemsController` and `DashboardController`.

**Key constraints:** No staff-only features, no chatbot, no payment gateway, no schema change unless a single migration is clearly required (e.g. no cart table—cart is session or frontend state). No digital payments.

**Pattern references:**
- Today's menu: `backend/app/Http/Controllers/MenuItemsController.php` (lines 17–22): `Carbon::today()`, `whereDate('menu_date', $today)`, `orderBy('category')->orderBy('name')`.
- Order model: `backend/app/Models/Order.php` (fillable: reference, channel, status, customer_name, customer_phone, total); `OrderItem` has order_id, menu_item_id, name, quantity, price.
- Inertia/React: `backend/resources/js/Pages/Dashboard.jsx` (useForm, router, Link, flash); existing `Menu.jsx` at `backend/resources/js/Pages/Menu.jsx` is a placeholder.
- Routes: `backend/routes/web.php` (GET `/menu` currently anonymous closure rendering `Menu` with no props).

---

## Key Decisions

- **Today's menu:** List `menu_items` where `menu_date = today`; show all items including sold-out (with 0 units or `is_sold_out` indicated). Same query pattern as `MenuItemsController::index` and `DashboardController::index`.
- **Cart:** Stored in **Laravel session** (no DB cart table). Structure: array of `{ menu_item_id, name, price, quantity }`. Add/remove/update quantity via backend endpoints; cart passed to relevant Inertia pages as props. When adding, validate that the item is today's, not sold out, and quantity ≤ units_today.
- **Checkout:** Single step: collect `customer_name` and `customer_phone`; create `Order` (unique `reference`, `channel=web`, `status=received`) and `OrderItems` from session cart; compute `total`; clear cart; redirect to confirmation page with order reference. Delivery/pickup is in spec scope (§9) but not in current `orders` schema; omit for this slice unless one optional migration adds a nullable `fulfillment_type` or `delivery_address` (documented as optional follow-up).
- **Order reference:** Generate a unique string (e.g. `Str::random(8)` with uniqueness check against `orders.reference`, retry on collision).
- **Auth:** No login required for `/menu`, cart, or checkout; routes remain public.

---

## Files to Create or Modify

| Action | Path | Purpose |
|--------|------|---------|
| Create | `backend/app/Http/Controllers/CustomerMenuController.php` | Index: today's menu + cart; cart actions: add, update, remove. |
| Create | `backend/app/Http/Controllers/CheckoutController.php` | Show checkout page (cart + form); store: create Order + OrderItems, clear cart, redirect. |
| Create | `backend/app/Http/Requests/StoreOrderRequest.php` | Validate customer_name, customer_phone (required, string, max length). |
| Modify | `backend/routes/web.php` | GET /menu → CustomerMenuController@index; POST /cart/add, etc.; GET /checkout, POST /checkout. |
| Modify | `backend/resources/js/Pages/Menu.jsx` | Receive menuItems + cart; list items (sold out / units); add to cart; cart summary; link to checkout. |
| Create | `backend/resources/js/Pages/Checkout.jsx` | Display cart, form (customer_name, customer_phone), submit to POST /checkout. |
| Create | `backend/resources/js/Pages/OrderConfirmation.jsx` | Show success message and order reference; link to /track. |
| No change | `backend/app/Models/Order.php`, `OrderItem.php`, `MenuItem.php` | Use as-is. |
| No change | `backend/app/Enums/OrderStatus.php`, `OrderChannel.php` | Use as-is. |

---

## Tasks

### Task 1: Backend — Today's menu and cart session contract

**Description:** Introduce a controller that serves the public customer menu and defines the session cart structure. Implement **index** only: load today's menu items (same query as `MenuItemsController::index`: `whereDate('menu_date', Carbon::today())`, order by category, name) and read cart from session (key e.g. `customer_cart`, default `[]`). Return Inertia render of `Menu` with props `menuItems` and `cart`. Do not implement add/remove yet; ensure the route is public.

**Files affected:**
- **Create** `backend/app/Http/Controllers/CustomerMenuController.php` — Method `index()`: get today's `MenuItem` list, get session cart (e.g. `session('customer_cart', [])`), return `Inertia::render('Menu', ['menuItems' => …, 'cart' => …])`.
- `backend/routes/web.php` — Replace the closure for `GET /menu` with `CustomerMenuController@index`.

**Dependencies:** None.

**Pattern reference:** `backend/app/Http/Controllers/MenuItemsController.php` (lines 15–28) for menu query; `DashboardController.php` for Inertia render with props.

**Acceptance criteria:**
```bash
./vendor/bin/sail php artisan route:list --path=menu
# Expect: GET /menu → CustomerMenuController@index (or similar).

# Request GET /menu (no auth); expect 200 and Inertia response with props menuItems (array), cart (array).
# menuItems: only rows where menu_date is today; cart: array (empty if first visit).
```

---

### Task 2: Backend — Cart add/update/remove (session)

**Description:** Implement cart mutations in the same controller (or a dedicated CartController; plan assumes `CustomerMenuController`): (a) **Add:** POST body `menu_item_id`, `quantity`. Validate: menu item exists, `menu_date` is today, not sold out, `quantity` ≤ `units_today`, `quantity` ≥ 1. Append or merge into session cart; redirect back to `/menu` with 302. (b) **Update:** e.g. POST/PUT with `menu_item_id`, `quantity`; update line in cart or remove if quantity 0. (c) **Remove:** remove line by `menu_item_id`. Cart stored as array of `{ menu_item_id, name, price, quantity }` (name/price snapshotted when adding to avoid stale prices). All actions redirect back to `/menu` or return JSON for SPA; for Inertia, redirect back is sufficient.

**Files affected:**
- `backend/app/Http/Controllers/CustomerMenuController.php` — Add methods `addToCart(Request $request)`, `updateCart(Request $request)`, `removeFromCart(Request $request)` (or single `cart(Request $request)` with action). Validate input; update `session('customer_cart')`; redirect back.
- `backend/routes/web.php` — Register `POST /cart/add`, `PUT /cart/update` (or `POST /cart/update`), `DELETE /cart/remove/{menuItem}` (or POST with payload). All public.

**Dependencies:** Task 1 (session cart and index exist).

**Acceptance criteria:**
```bash
# Add: POST /cart/add with menu_item_id, quantity for today's non–sold-out item → 302 to /menu; session has cart with one line.
# Add: POST with sold-out or tomorrow's item → 422 or 404.
# Update quantity to 0 or remove → line removed from session cart.
# GET /menu after add → props.cart contains expected lines with name, price, quantity.
```

---

### Task 3: Backend — Checkout (create Order + OrderItems, clear cart)

**Description:** Create a checkout flow: (1) **GET /checkout:** If cart empty, redirect to `/menu`. Otherwise render Inertia `Checkout` with `cart` (and optionally cart total). (2) **POST /checkout:** Validate `StoreOrderRequest` (customer_name, customer_phone). Generate unique order reference (e.g. `Str::random(8)` until `Order::where('reference', $ref)->doesntExist()`). Create `Order` with `channel=OrderChannel::Web`, `status=OrderStatus::Received`, `customer_name`, `customer_phone`, `total` (sum of price*quantity for cart lines). Create `OrderItem` for each cart line (menu_item_id, name, quantity, price). Clear session cart. Redirect to confirmation page (e.g. `/order-confirmation/{order}` or with flash + redirect to `/track?ref=...`). Use DB transaction for order + order_items creation.

**Files affected:**
- **Create** `backend/app/Http/Requests/StoreOrderRequest.php` — `authorize()` true; `rules()`: customer_name required, string, max:255; customer_phone required, string, max:50 (or similar).
- **Create** `backend/app/Http/Controllers/CheckoutController.php` — `index()`: read cart from session; if empty redirect to `/menu`; else `Inertia::render('Checkout', ['cart' => …, 'total' => …])`. `store(StoreOrderRequest $request)`: create Order + OrderItems, clear cart, redirect to confirmation with order reference.
- `backend/routes/web.php` — GET /checkout → CheckoutController@index; POST /checkout → CheckoutController@store. Public.

**Dependencies:** Task 2 (cart in session and structure defined).

**Pattern reference:** `backend/app/Http/Controllers/MenuItemsController.php` (FormRequest usage); `Order`, `OrderItem` models and fillable/casts.

**Acceptance criteria:**
```bash
./vendor/bin/sail php artisan route:list --path=checkout
# Expect: GET and POST /checkout.

# POST /checkout with valid customer_name, customer_phone and non-empty cart → 302; Order exists with channel=web, status=received, correct total; OrderItems match cart; session cart empty.
# POST /checkout with empty cart → redirect to /menu or 422.
# Order reference is unique (run twice, two different references).
```

---

### Task 4: Frontend — Menu page (list today's menu, cart summary, add to cart)

**Description:** Replace the placeholder `Menu.jsx` so it consumes `menuItems` and `cart` from props. Display today's menu (name, price, category, units_today or “Sold out”). For each item: if not sold out and units_today > 0, allow quantity input and “Add to cart” (POST to `/cart/add`). Display cart summary (list of name, quantity, price, line total; optional remove/update). Link or button “Proceed to checkout” to GET `/checkout`. Use existing nav (Link to Home, Dashboard, Menu, Track) and follow Inertia patterns (router.post, useForm if needed). Prefer shadcn/ui components for buttons/inputs if present; otherwise simple Tailwind markup.

**Files affected:**
- `backend/resources/js/Pages/Menu.jsx` — Props: `menuItems`, `cart`. Render list of items with sold-out state and add-to-cart form/button; cart summary; link to `/checkout`.

**Dependencies:** Task 1 (props provided by backend). Task 2 needed for add-to-cart to work end-to-end.

**Pattern reference:** `backend/resources/js/Pages/Dashboard.jsx` (Link, router, useForm, flash); `Menu.jsx` (current nav and title).

**Acceptance criteria:**
```bash
./vendor/bin/sail npm run build
# Expected: Exit code 0.

# Manual/Inertia: Open /menu; see today's menu items; sold-out items shown with 0 or “Sold out”; add item → cart summary updates; “Proceed to checkout” goes to /checkout.
```

---

### Task 5: Frontend — Checkout page (cart review + customer form)

**Description:** Add `Checkout.jsx` that receives `cart` (and optionally `total`) from props. Render cart lines (name, quantity, price, line total) and grand total. Form: `customer_name`, `customer_phone`; submit via POST to `/checkout` (e.g. router.post). On validation error, show errors; on success, user is redirected to confirmation page. Include nav consistent with Menu/Welcome.

**Files affected:**
- **Create** `backend/resources/js/Pages/Checkout.jsx` — Props: `cart`, optional `total`. Form with customer_name, customer_phone; submit to POST /checkout; display validation errors.

**Dependencies:** Task 3 (GET/POST checkout routes and controller).

**Acceptance criteria:**
```bash
./vendor/bin/sail npm run build
# Expected: Exit code 0.

# Visit /checkout with empty cart → redirect to /menu.
# Visit /checkout with cart → form visible; submit valid data → redirect to confirmation; submit invalid data → validation errors shown.
```

---

### Task 6: Frontend — Order confirmation page

**Description:** Add a confirmation page shown after successful checkout. It can be a dedicated route (e.g. GET `/order-confirmation/{order}` or `/order-confirmation?reference=XXX`) that receives the order (or reference) and displays “Order placed” and the order reference, with a link to `/track` for tracking. If implementation uses redirect-with-flash to `/track?ref=...`, then a simple success message on Track or a dedicated minimal confirmation view both satisfy the requirement; prefer a dedicated confirmation route so the user sees a clear “Order placed” state without depending on Track page implementation.

**Files affected:**
- **Create** `backend/resources/js/Pages/OrderConfirmation.jsx` — Props: `order` (or `reference`). Display success message and reference; link to `/track`.
- `backend/app/Http/Controllers/CheckoutController.php` — After store, redirect to confirmation route (e.g. `redirect()->route('order.confirmation', ['reference' => $order->reference])`).
- `backend/routes/web.php` — GET `/order-confirmation/{order}` or `/order-confirmation?reference=...` → render `OrderConfirmation` with order/reference. Public (or show only reference to avoid leaking other customer data).

**Dependencies:** Task 3.

**Pattern reference:** Same nav/Link style as Menu and Checkout.

**Acceptance criteria:**
```bash
# After successful POST /checkout, user lands on confirmation page with order reference visible and link to /track.
```

---

### Task 7: Route and link consistency

**Description:** Ensure all customer-facing routes are public (no auth middleware): GET /menu, GET /checkout, POST /checkout, POST /cart/add, etc. Ensure Welcome and Menu (and Checkout, OrderConfirmation) nav links point to correct paths. Fix any broken links or missing route names.

**Files affected:**
- `backend/routes/web.php` — Confirm no `auth` middleware on customer menu, cart, checkout, confirmation routes.
- `backend/resources/js/Pages/Welcome.jsx` — Menu link to `/menu` (already present).
- `backend/resources/js/Pages/Menu.jsx` — Nav and “Proceed to checkout” link to `/checkout`.

**Dependencies:** Tasks 1–3, 6.

**Acceptance criteria:**
```bash
./vendor/bin/sail php artisan route:list
# Customer routes (menu, cart, checkout, order-confirmation) are outside auth middleware.

# Clicking “Menu” from Welcome goes to /menu; from Menu, “Proceed to checkout” goes to /checkout; after order, link to /track works.
```

---

## Parallelization

| Tasks | Can run in parallel? |
|-------|------------------------|
| Task 1 | Yes (no dependency). |
| Task 2 | After Task 1. |
| Task 3 | After Task 2. |
| Task 4 | After Task 1 (Task 2 needed for full E2E add-to-cart). |
| Task 5 | After Task 3. |
| Task 6 | After Task 3. |
| Task 7 | After 1–3 and 6 (link/route cleanup). |

**Suggested order:** Task 1 → Task 2 and Task 4 in parallel (backend cart + frontend menu); then Task 3 → Task 5 and Task 6 in parallel; then Task 7.

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Cart session key conflicts with other uses | Wrong data in cart | Use a dedicated key (e.g. `customer_cart`) and document in controller. |
| Order reference collision | Duplicate key error | Retry generation in a loop with uniqueness check; use short random string (e.g. 8 chars) and expect negligible collision rate. |
| Sold-out item added to cart before another request sells last unit | Oversell | Optionally re-validate availability in CheckoutController::store and reduce units_today (or reject and ask to remove); can be a follow-up. For MVP, creating the order from cart is acceptable; staff can adjust. |
| Delivery/pickup not collected | Product gap if spec required | Spec §9 lists pickup and delivery in scope but schema has no column. Plan keeps checkout to name + phone; add optional migration + field later if required. |

---

## Execution Notes

- Run all commands from `backend/` with Sail: `./vendor/bin/sail php artisan ...`, `./vendor/bin/sail npm run build`.
- No new migration unless adding optional fulfillment_type/delivery_address later.
- Use existing enums: `OrderChannel::Web`, `OrderStatus::Received`.
- OrderItem stores snapshot `name` and `price` from menu at add-to-cart or checkout time so historical orders remain correct if menu changes.
