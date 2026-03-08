# Stock System Touch Points

Reference for Phase 3 refactor: every place that reads or writes `units_today` or uses `virtual_available`.

## Backend

| # | File | Type | What |
|---|------|------|------|
| 1 | `app/Services/MenuItemStockService.php` | Read | Reads `units_today` (or daily_stock), computes `virtual_available = set - reserved - sold` |
| 2 | `app/Http/Controllers/OrdersController.php` (line ~172-176) | Write | On order completion: decrement `units_today` (Phase 3: increment `daily_stock.units_sold`) |
| 3 | `app/Http/Controllers/MenuItemsController.php` | Read/Write | Uses `getVirtualAvailableForToday`; store/update set `units_today` (Phase 3: write `daily_stock.units_set`) |
| 4 | `app/Http/Controllers/CustomerMenuController.php` | Read | `getVirtualAvailableForTodayAll`; sold-out check uses `units_today <= 0` |
| 5 | `app/Http/Controllers/CheckoutController.php` | Read | `getVirtualAvailableForToday` before placing order |
| 6 | `app/Chatbot/ChatbotOrderService.php` | Read | `getVirtualAvailableForToday` before placing order |
| 7 | `app/Http/Controllers/ChatbotWebhookController.php` | Read | Calls `getVirtualAvailableForToday` for state |
| 8 | `app/Http/Controllers/FacebookMessengerWebhookController.php` | Read | Same |
| 9 | `routes/console.php` (menu:reset-today) | Write | Reset: set `units_today = 0`; rollover creates with `units_today = 0` (Phase 3: daily_stock) |
| 10 | `app/Models/MenuItem.php` | Model | `units_today` in fillable, casts |
| 11 | `app/Http/Requests/StoreMenuItemRequest.php` | Validation | `units_today` required |
| 12 | `app/Http/Requests/UpdateMenuItemRequest.php` | Validation | `units_today` optional |

## Frontend

| # | File | What |
|---|------|------|
| 13 | `resources/js/Pages/MenuItems.jsx` | Displays `units_today` (Qty), `virtual_available` (On the line) |
| 14 | `resources/js/Pages/Menu.jsx` | Uses `item.available` / `units_today` for sold-out and add-to-cart |

## Tests

- `tests/Feature/MenuItemStockAndOrderCompletionTest.php` — virtual_available, decrement on completion
- `tests/Feature/MenuResetCommandTest.php` — reset, rollover, snapshot
- `tests/Feature/ChatbotWebhookTest.php` — fixtures use `units_today`

## Phase 3 Migration Notes

- **MenuItemStockService:** Read `units_set`, `units_sold` from `menu_item_daily_stock`; reserved from OrderItem (unchanged). Return `units_set - reserved - units_sold`.
- **OrdersController:** In transaction: update order status; for each order_item, `MenuItemDailyStock::where(...)->increment('units_sold', qty)`. Keep or drop `menu_items.units_today` decrement (can keep in sync for transition).
- **MenuItemsController:** On store: create `menu_item_daily_stock` row with `units_set`. On update: update `menu_item_daily_stock.units_set` (and `menu_items.units_today` if kept).
- **CustomerMenuController:** Sold-out check: use daily_stock or keep reading `menu_items.units_today` until deprecated.
- **console.php:** Rollover: create daily_stock row with 0. Reset: snapshot (Phase 1), then update daily_stock for today to units_set=0, units_sold=0, units_leftover=0; update menu_items is_sold_out, units_today=0.
- **Seeders:** Create `menu_item_daily_stock` row when creating menu_items for today.
