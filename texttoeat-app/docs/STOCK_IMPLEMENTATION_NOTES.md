# Stock Refactor: Implementation Notes

Notes for Phase 3 (Option C) and related phases.

---

## Mid-Day units_set Propagation

When staff adjusts quantity (e.g. Caldereta 30 to 20), the new value must propagate **immediately** to:

- Portal MenuItems page (On the line)
- Customer menu (available count)
- Chatbot (inventory check)
- Checkout (inventory check)

**Handling in Phase 3:** Staff updates write directly to `menu_item_daily_stock.units_set`. `MenuItemStockService::getVirtualAvailableForToday` reads from `menu_item_daily_stock` and computes `virtual_available = units_set - reserved - units_sold`. No EOD batch; all consumers read live. Ensure `MenuItemsController::update` and create flows write to `menu_item_daily_stock.units_set`, and that daily_stock row exists for today before any read.

---

## Historical / Orphaned Data

No backfill of past data. In dev:

- Wipe and migrate fresh
- Update seeders to create `menu_item_daily_stock` rows where needed
- Do not derive anything from old `menu_items` rows

---

## Race Conditions: Order Completion

When two orders complete simultaneously, both try to increment `units_sold`. Use:

1. **DB::transaction** around the full completion logic (status update + units_sold increments)
2. **Atomic increments:** `MenuItemDailyStock::where(...)->increment('units_sold', $qty)` instead of read-modify-write

Example:

```php
DB::transaction(function () use ($order) {
    $order->update(['status' => OrderStatus::Completed]);
    foreach ($order->orderItems as $orderItem) {
        if ($orderItem->menu_item_id) {
            MenuItemDailyStock::query()
                ->where('menu_item_id', $orderItem->menu_item_id)
                ->whereDate('menu_date', Carbon::today())
                ->increment('units_sold', $orderItem->quantity);
        }
    }
});
```

---

## Label: Avail. to On the Line

In `MenuItems.jsx` line 388, change label from "Avail." to "On the line". Can be done in Phase 1 or 3; no dependency on refactor.
