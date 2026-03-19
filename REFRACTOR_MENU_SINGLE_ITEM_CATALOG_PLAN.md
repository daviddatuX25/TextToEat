## Goal

Move from a **per-day `MenuItem` model** (new row per day, filtered by `menu_date`) to a **single-item catalog model**:

- Each dish has **one `menu_items` row** (stable ID).
- Per-day stock and sell-through are tracked **only in `menu_item_daily_stock`** (and `menu_item_daily_snapshots`).
- **Admin views** always list **all dishes**, with per-day stock (defaulting to today) and a clear "out of stock" indicator instead of hiding items.
- **Customer views** keep seeing only available items, computed from daily stock.
- Existing analytics (leaderboard, rising/falling, sell-through) continue to work or become simpler.

## Key existing pieces

- `menu_items` model and scope:
  - `[texttoeat-app/app/Models/MenuItem.php](texttoeat-app/app/Models/MenuItem.php)` has `menu_date`, `units_today`, `is_sold_out`, and a `forToday()` scope that filters by `menu_date = today` and `is_sold_out = false`.
- Admin menu management:
  - `[texttoeat-app/app/Http/Controllers/MenuItemsController.php](texttoeat-app/app/Http/Controllers/MenuItemsController.php)` currently filters by `whereDate('menu_date', today)` and exposes `units_today` and `is_sold_out` to the Inertia page.
  - `[texttoeat-app/resources/js/Pages/MenuItems.jsx](texttoeat-app/resources/js/Pages/MenuItems.jsx)` shows a "Today’s menu" grid using `units_today` and `is_sold_out`.
- Customer menu:
  - `[texttoeat-app/app/Http/Controllers/CustomerMenuController.php](texttoeat-app/app/Http/Controllers/CustomerMenuController.php)` filters by `menu_date = today` and uses `MenuItemStockService::getVirtualAvailableForTodayAll()` to compute an `available` field.
  - `[texttoeat-app/resources/js/Pages/Menu.jsx](texttoeat-app/resources/js/Pages/Menu.jsx)` uses `available`/`units_today` and `is_sold_out` to control ordering.
- Daily stock and snapshots:
  - `[texttoeat-app/app/Models/MenuItemDailyStock.php](texttoeat-app/app/Models/MenuItemDailyStock.php)` tracks `menu_item_id`, `menu_date`, `units_set`, `units_sold`, `units_leftover`.
  - `MenuItemDailySnapshot` is used in `menu:reset-today` to snapshot current stock before reset.
- Reset logic and scheduler:
  - `[texttoeat-app/routes/console.php](texttoeat-app/routes/console.php)` defines `menu:reset-today`, which:
    - Copies yesterday’s `MenuItem` rows into today (new IDs, `menu_date = today`, `units_today = 0`, `is_sold_out = true`).
    - Zeros `MenuItemDailyStock` for today and sets all today items to sold out.
  - An hourly scheduled closure triggers `menu:reset-today` once per day based on `menu.auto_reset_enabled` and `menu.auto_reset_at_hour`.
- Analytics:
  - `[texttoeat-app/app/Http/Controllers/AnalyticsController.php](texttoeat-app/app/Http/Controllers/AnalyticsController.php)` aggregates by `OrderItem.name`, and uses `MenuItemDailyStock` grouped by `menu_item_id` and `menu_date` for sell-through; it does not strictly depend on daily duplication of `MenuItem` rows.

## High-level design after refactor

1. **Catalog-style `MenuItem`:**
  - Treat `menu_items` as the **catalog of dishes**, not per-day rows.
  - Each dish is created once and reused across days by attaching daily stock records.
  - `menu_date` on `MenuItem` becomes legacy/optional (can be ignored in most queries, possibly later deprecated via migration).
2. **Per-day stock in `MenuItemDailyStock`:**
  - For each `MenuItem` and each service day, we have at most **one `MenuItemDailyStock` row** keyed by `(menu_item_id, menu_date)`.
  - `units_set`, `units_sold`, `units_leftover` define availability for that date.
  - `MenuItemStockService` remains the main way to compute `available` based on stock + current orders.
3. **Reset behavior (`menu:reset-today`):**
  - Stop creating new `MenuItem` rows for today.
  - New behavior per reset:
    - **Snapshot** yesterday’s and/or today’s stock into `MenuItemDailySnapshot` as now (for analytics).
    - For the new day, **insert or update** `MenuItemDailyStock` rows to:
      - `menu_date = today`, `units_set = 0`, `units_sold = 0`, `units_leftover = 0` (unless you want to pre-fill).
    - Do **not** touch `MenuItem` existence; optionally, set a lightweight `is_sold_out` flag based on today’s stock (or derive sold-out strictly from `available == 0`).
4. **Admin visibility:**
  - Admin menu pages list **all dishes** from `MenuItem` (optionally with search/category filters), independent of date.
  - For a selected date (default today), join or map in the corresponding `MenuItemDailyStock` row to show:
    - "Units for today", "sold", "leftover".
  - Items with no stock row yet for that date appear with **0 stock** and an "out of stock / not set" badge, but remain visible and editable.
5. **Customer visibility:**
  - Customer controllers stop relying on `menu_date` on `MenuItem`, and instead:
    - Use `MenuItem` for the catalog, filtered to dishes that should be customer-visible (e.g. by category, a `is_active` flag, etc.).
    - Use `MenuItemStockService` with `menu_date = today` to compute `available` per dish.
  - Customer UI still shows only items with `available > 0` and/or not sold-out.
6. **Analytics:**
  - Analytics continues to aggregate by `OrderItem.name` and `MenuItemDailyStock`; with a stable `menu_item_id` per dish, sell-through metrics become easier to interpret.
  - Ensure that the new reset behavior still populates `MenuItemDailySnapshot` and `MenuItemDailyStock` so existing queries remain valid.

## Detailed step-by-step plan

### 1. Model and schema review

- Review `MenuItem` usages:
  - Search for `menu_date` and `units_today` across controllers, services, and views to understand all dependencies.
- Confirm all places where `MenuItemDailyStock` and `MenuItemDailySnapshot` are used (besides reset and analytics).
- Identify any routes or jobs that assume **one `MenuItem` per day**.

### 2. Introduce catalog semantics for `MenuItem`

- Decide a simple rule for which `MenuItem` rows represent the **canonical catalog**:
  - Option A (simpler): treat all existing `MenuItem` rows as catalog entries, regardless of `menu_date`; historical rows remain but are no longer filtered by date.
  - Option B (cleaner but more involved): pick a representative row per unique dish (e.g. by name + category) and mark others as archival.
- For the first pass, prefer **Option A** (no data migration) and rely on application logic to avoid duplicate-looking dishes for admins (e.g. group or hide exact-name duplicates if needed later).

### 3. Change admin controllers to ignore `menu_date`

- In `MenuItemsController@index`:
  - Remove `whereDate('menu_date', $today)` filtering.
  - Keep category filter and ordering by category and name.
  - Fetch today’s stock using `MenuItemStockService` or direct `MenuItemDailyStock` queries keyed by `(menu_item_id, today)`.
  - Attach `virtual_available` and `current_orders` as now, but based purely on `MenuItemDailyStock` for today, not `units_today` on `MenuItem`.
- Decide how to treat `units_today` on `MenuItem`:
  - Transitional approach: keep writing `units_today` in admin when editing, but also persist that into `MenuItemDailyStock` for today; when reading, prefer the stock table for availability.
  - Longer-term goal: remove `units_today` and treat `units_*` as stock-only concepts.

### 4. Update admin UI to show catalog + per-day stock

- In `Pages/MenuItems.jsx`:
  - Stop assuming that the page is strictly "Today’s menu"; instead, treat it as a **catalog with today’s stock** (initially still labelled as today for UX clarity).
  - For each item:
    - Use stock data (from props) to show:
      - Units for today (editable field).
      - Low-stock and sold-out badges based on `available` or `units_leftover`.
  - Ensure items with **0 stock or no stock row** are still listed, styled as "Out of stock" but **not hidden**.
  - Keep existing controls (`EnableForTodayDialog`, quantity +/-) but wire them to update `MenuItemDailyStock` for today rather than only `MenuItem.units_today`.

### 5. Rework reset command to operate on stock only

- In `routes/console.php` (`menu:reset-today`):
  - Remove the part that **creates new `MenuItem` rows for today** from yesterday.
  - Keep (or refine) the snapshot step to `MenuItemDailySnapshot` for analytics.
  - Change the reset phase to:
    - For each `MenuItem` in the catalog (or a subset with `is_active` flag):
      - Upsert a `MenuItemDailyStock` row for `menu_date = today` with desired initial values, usually zeros.
    - Optionally, clear or set `is_sold_out` flags on `MenuItem` based on today’s stock, or derive sold-out from stock only.
  - Ensure the command remains idempotent (running twice does not duplicate stock rows or corrupt data).

### 6. Adjust customer controllers to use catalog + stock

- In `CustomerMenuController@index`:
  - Replace `whereDate('menu_date', $today)` with a catalog-based query (e.g. all `MenuItem` rows, filtered by `is_active`/category).
  - Use `MenuItemStockService::getVirtualAvailableForTodayAll()` keyed by **catalog IDs** to compute availability for today.
  - Ensure `addToCart` and server-side validation in `addToCart` still prevent ordering when `available <= 0`.

### 7. Verify analytics compatibility

- In `AnalyticsController`:
  - Confirm that:
    - Leaderboard still aggregates by `OrderItem.name` (unchanged).
    - Sell-through queries against `MenuItemDailyStock` remain valid when multiple dates share the same `menu_item_id`.
  - If any query assumed only one stock row per `menu_item_id` globally (not per date), adjust grouping to use both `menu_item_id` and `menu_date` where appropriate.

### 8. Edge cases and robustness

- **Gaps in usage** (no activity for several days):
  - Admin catalog still shows all dishes; today’s stock simply shows 0 for all until set.
  - Reset can be run multiple days later; it only creates/updates stock rows for the current date and snapshots past days if needed, without breaking.
- **Partial adoption** (old per-day rows still exist):
  - Admin and customer queries should be written so they **do not depend on `menu_date` on `MenuItem`**, meaning old rows do not cause failures; they may cause duplicate-looking dishes which can be handled separately if needed.
- **Concurrency** (editing stock vs orders coming in):
  - Continue using `MenuItemStockService` and transactional updates in `OrdersController` to keep `units_sold` and `units_leftover` consistent.

### 9. Testing strategy

- **Unit/feature tests**:
  - Update or add tests to cover:
    - Admin can see items with 0 stock (already partially covered by `AdminMenuVisibilityTest`).
    - Reset command no longer creates new `MenuItem` rows and correctly initializes `MenuItemDailyStock` for today.
    - Customer menu only shows items with `available > 0` computed from stock after the refactor.
    - Analytics leaderboard and sell-through still match expectations across a date range.
- **Manual flows** in a staging environment:
  - Create dishes in the catalog; run reset; verify admin sees all dishes with 0 stock and can set stock for today.
  - Place orders and complete them; verify stock and analytics update correctly.

## Initial todos

- **catalog-model-review**: Map all usages of `MenuItem.menu_date` and `units_today` and decide which can be removed or migrated to stock-only logic.
- **admin-catalog-query**: Change admin menu controllers to treat `MenuItem` as a catalog (no date filter) and attach per-day stock for the selected date.
- **reset-stock-only**: Refactor `menu:reset-today` to stop duplicating `MenuItem` rows per day and operate purely on stock and snapshots.
- **customer-catalog-and-stock**: Update customer menu controller to use catalog items + per-day stock instead of per-day `MenuItem` rows.
- **analytics-validation**: Re-validate and, if needed, adjust analytics queries so they work with stable `menu_item_id`s and per-day stock rows.

