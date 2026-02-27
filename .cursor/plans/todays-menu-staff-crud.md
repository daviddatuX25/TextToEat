# Work Plan: Today's Menu (Staff) CRUD

## Overview

Implement staff-only CRUD for menu items scoped to **today** (`menu_date`), per TEXTTOEAT_SPECIFICATION.md §12.3 item 2 and §6 Staff Interface. The codebase already has the data model, migrations, `MenuItem` model, `MenuItemsController` (index/store/update/destroy), auth-protected routes under `/dashboard/menu-items`, and a Dashboard with a "Today's Menu" tab that lists items, adds new items, and supports in-row edit of `units_today` and `is_sold_out` plus remove. This plan completes the feature by: (1) scoping update/destroy to today’s items only, (2) adding full edit of name, price, and category in the UI, and (3) optionally extracting validation into FormRequests and syncing the menu tab with the URL.

**Key constraints:** No schema/migration changes, no Kitchen List/Messages/Sales implementation, no chatbot or external APIs. Auth/middleware same as existing Dashboard (already in place).

**Pattern reference:** Backend follows existing `MenuItemsController` and `DashboardController` (Carbon::today(), Inertia::render('Dashboard', …)). Frontend follows existing `Dashboard.jsx` (tabs, `useForm`, `router.post/put/delete`, flash messages).

---

## Key Decisions

- **Single page:** Today's Menu stays as a **tab** on the existing Staff Dashboard (`Dashboard.jsx`), not a separate Page. Data is loaded via existing `MenuItemsController::index` when visiting `/dashboard/menu-items` or when Dashboard is loaded with `tab: 'menu'` and `menuItems` from `DashboardController`/`MenuItemsController`.
- **Edit UX:** Extend the existing in-row edit in `MenuItemRow` to include name, price, and category (not only units and sold out), keeping one row that expands or shows inline inputs. No new page or route for edit.
- **Scoping:** Update and destroy must ensure the `MenuItem` belongs to today (`menu_date = Carbon::today()`); otherwise return 404. Prevents altering other days’ items via ID.
- **Validation:** Keep inline validation in controller as the baseline; optional task to extract to FormRequest classes for consistency and reuse.
- **Tab/URL:** Optional task to drive the "Today's Menu" tab from the URL (e.g. link tab to `/dashboard/menu-items`) so refresh preserves the active tab.

---

## Files to Create vs Modify

| Action   | Path | Purpose |
|----------|------|--------|
| Modify   | `backend/app/Http/Controllers/MenuItemsController.php` | Scope `update`/`destroy` to today; optionally keep or move validation to FormRequests. |
| Create   | `backend/app/Http/Requests/StoreMenuItemRequest.php` | (Optional) Validation for store. |
| Create   | `backend/app/Http/Requests/UpdateMenuItemRequest.php` | (Optional) Validation for update. |
| Modify   | `backend/resources/js/Pages/Dashboard.jsx` | Today's Menu tab: extend `MenuItemRow` to edit name, price, category; optional tab–URL sync. |
| No change | `backend/routes/web.php` | Routes already exist under auth. |
| No change | `backend/app/Models/MenuItem.php` | Model and fillable already match spec. |
| No change | `backend/database/migrations/..._create_menu_items_table.php` | Schema already has name, price, category, units_today, is_sold_out, menu_date. |

---

## Tasks

### Task 1: Scope update and destroy to today’s menu only

**Description:** In `MenuItemsController`, ensure `update` and `destroy` only act on items whose `menu_date` is today. If the resolved `MenuItem` is not for today, abort with 404. Prevents cross-day edits/deletes via ID.

**Files affected:**
- `backend/app/Http/Controllers/MenuItemsController.php` — In `update()` and `destroy()`, after resolving `$menuItem`, add a check that `$menuItem->menu_date->isToday()` (or equivalent date comparison). If not, `abort(404)`.

**Dependencies:** None.

**Pattern reference:** Same controller; use Carbon/CarbonImmutable or `whereDate`-scoped query to re-fetch or compare `menu_date`.

**Acceptance criteria:**
```bash
# From backend/ with Sail
./vendor/bin/sail php artisan tinker --execute="
  $tomorrow = \Carbon\Carbon::tomorrow();
  $item = \App\Models\MenuItem::factory()->create(['menu_date' => $tomorrow]);
  $url = '/dashboard/menu-items/' . $item->id;
  echo 'Created item for tomorrow: ' . $item->id . PHP_EOL;
"
# Then (manual or feature test): PUT and DELETE to /dashboard/menu-items/{id} for that id return 404.
# GET /dashboard/menu-items lists only today's items; updating/deleting today's item still works.
```
- No change to index or store behavior (already scoped to today).

---

### Task 2 (optional): Extract store validation into StoreMenuItemRequest

**Description:** Create a FormRequest for `store()` that validates `name`, `price`, `category`, `units_today` (required, rules as currently in controller). Use it in `MenuItemsController::store`.

**Files affected:**
- **Create** `backend/app/Http/Requests/StoreMenuItemRequest.php` — `authorize()` return true; `rules()` return array for name (required, string, max:255), price (required, numeric, min:0), category (required, string, max:255), units_today (required, integer, min:0).
- `backend/app/Http/Controllers/MenuItemsController.php` — Replace `Request $request` and `$request->validate(...)` in `store()` with `StoreMenuItemRequest $request` and `$request->validated()`.

**Dependencies:** None. Can run in parallel with Task 1 and Task 3.

**Acceptance criteria:**
```bash
./vendor/bin/sail php artisan route:list --path=dashboard/menu-items
# Expect: POST dashboard/menu-items still registered.

# Submit invalid data (e.g. empty name) via UI or curl; expect 422 and validation errors in response.
# Submit valid data; expect 302 redirect and new MenuItem for today.
```

---

### Task 3 (optional): Extract update validation into UpdateMenuItemRequest

**Description:** Create a FormRequest for `update()` that validates `name`, `price`, `category`, `units_today`, `is_sold_out` (all `sometimes`, same rules as in controller). Use it in `MenuItemsController::update`.

**Files affected:**
- **Create** `backend/app/Http/Requests/UpdateMenuItemRequest.php` — `authorize()` return true; `rules()` with sometimes + string/numeric/integer/boolean as appropriate.
- `backend/app/Http/Controllers/MenuItemsController.php` — Replace `Request $request` and `$request->validate(...)` in `update()` with `UpdateMenuItemRequest $request` and `$request->validated()`.

**Dependencies:** None. Can run in parallel with Task 1 and Task 2.

**Acceptance criteria:**
```bash
# PUT with valid partial payload (e.g. only units_today) updates only that field.
# PUT with invalid data returns 422. After Task 1, PUT for non-today item returns 404.
```

---

### Task 4: Add edit for name, price, and category in Today’s Menu tab

**Description:** In `Dashboard.jsx`, extend `MenuItemRow` so that in edit mode the user can change **name**, **price**, and **category** in addition to `units_today` and `is_sold_out`. Keep a single row UX (e.g. row expands or inline inputs). On save, send all edited fields via PUT to `/dashboard/menu-items/{id}`. Backend already accepts these in `update()`.

**Files affected:**
- `backend/resources/js/Pages/Dashboard.jsx` — In `MenuItemRow`: (1) Initialize edit form with `name`, `price`, `category` from `item` in addition to `units_today` and `is_sold_out`. (2) In edit mode, show inputs for name, price, category (and keep existing units and sold-out controls). (3) On Save, submit full form data via `form.put(...)` so backend receives name, price, category, units_today, is_sold_out where provided.

**Dependencies:** Task 1 recommended first (so edit is only for today’s items). No dependency on Task 2 or 3.

**Pattern reference:** Existing `MenuItemRow` and `useForm` in same file; follow same input styling and error display as the add form in `TodayMenuTab`.

**Acceptance criteria:**
```bash
# 1) Build passes
./vendor/bin/sail npm run build
# Expected: Exit code 0.

# 2) Manual/Inertia: Visit /dashboard/menu-items (logged in). Click Edit on a row. Change name, price, category, units, sold out. Save. Page reloads/refreshes with updated values.
# 3) Validation: Submit invalid data (e.g. empty name or negative price) and expect validation errors shown in UI (from backend).
```

---

### Task 5 (optional): Sync Today’s Menu tab with URL

**Description:** Make the "Today's Menu" tab URL-driven so that opening `/dashboard/menu-items` shows the menu tab and refreshing keeps it. Use `initialTab` from props (already passed by `MenuItemsController::index` as `tab: 'menu'`). Change the tab button for "Today's Menu" from a local `setTab('menu')` to a `Link` to `/dashboard/menu-items`, and for "Kitchen List" to `Link` to `/dashboard`. Ensure Dashboard still passes `menuItems` and `tab` when rendered from either route (already: DashboardController passes menuItems + tab kitchen; MenuItemsController passes menuItems + tab menu).

**Files affected:**
- `backend/resources/js/Pages/Dashboard.jsx` — Replace the tab buttons for Kitchen and Today's Menu with `<Link>` to `/dashboard` and `/dashboard/menu-items` respectively, and use the `initialTab` from props to set initial state (or derive active tab from current URL if available). Keep Messages and Sales as buttons that only set local state until those routes exist.

**Dependencies:** None. Can run in parallel with Task 4.

**Acceptance criteria:**
```bash
# Visit /dashboard/menu-items. Active tab is "Today's Menu". Refresh: still "Today's Menu".
# Visit /dashboard. Active tab is "Kitchen List". Click "Today's Menu" (link) → navigates to /dashboard/menu-items, tab stays "Today's Menu".
./vendor/bin/sail npm run build
# Expected: Exit code 0.
```

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Edit form sends all fields; backend might overwrite with empty if not careful | Wrong data saved | Use `sometimes` in update validation; frontend send only changed fields or full row data (full row is fine as long as backend uses `sometimes` and existing values are pre-filled). |
| Route model binding returns any MenuItem by id | Cross-day edit/delete | Task 1: enforce `menu_date` = today in update/destroy. |
| Tab state lost on refresh | Poor UX | Task 5: link menu tab to `/dashboard/menu-items`. |

---

## Execution Notes

- **Order:** Task 1 first (backend safety). Tasks 2 and 3 (FormRequests) can run in parallel with each other and with Task 1. Task 4 (frontend edit) should follow Task 1; can run in parallel with Task 2/3. Task 5 (tab–URL) can run in parallel with Task 4.
- **Parallelizable:** Tasks 1, 2, 3 can be done in parallel. After Task 1, Task 4 can proceed; Task 5 is independent of Task 4.
- **Verification:** After all tasks: run `./vendor/bin/sail npm run build`, and manually or via feature test: add item, edit (name, price, category, units, sold out), remove item, mark sold out; ensure only today’s items are editable/deletable.

---

## Acceptance Criteria (Overall Feature)

- Staff can open Dashboard and switch to "Today's Menu" (or land on `/dashboard/menu-items`).
- Staff can **add** a menu item (name, price, category, units_today) for today.
- Staff can **edit** an existing item: name, price, category, units_today, and is_sold_out.
- Staff can **remove** an item from today’s menu (delete).
- Staff can **mark sold out** (toggle or set units to 0); backend supports both `is_sold_out` and `units_today`.
- Only items with `menu_date` = today are listed and only they can be updated or deleted.
- All actions are behind existing auth middleware (same as Dashboard).
- No database schema or migration changes. No Kitchen List, Messages, Sales, chatbot, or external API work in this plan.
