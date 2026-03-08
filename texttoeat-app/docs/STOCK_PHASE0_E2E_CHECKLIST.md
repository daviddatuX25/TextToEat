# Phase 0: Stock System End-to-End Test Checklist

Run this checklist before Phase 1 (Option A snapshot) to validate the current stock flow and capture any edge cases.

---

## Automated Tests (Complete)

| Test | Status | Notes |
|------|--------|-------|
| virtual_available excludes pending orders | Pass | MenuItemStockAndOrderCompletionTest |
| completing order decrements units_today | Pass | OrdersController decrements on completion |
| menu item category must be from fixed list | Pass | Validation |
| rollover copies yesterday to today and resets | Pass | MenuResetCommandTest |
| reset updates existing today items | Pass | |
| rollover is idempotent no duplicates | Pass | |
| force flag bypasses morning check | Pass | |

---

## Manual Checklist

### 1. Menu Reset

- [ ] Run: `php artisan menu:reset-today --force`
- [ ] Confirm: today's items have `units_today = 0`, `is_sold_out = true`
- [ ] Confirm: rollover created new rows for items that existed only yesterday
- [ ] Confirm: greeting modal flag set (Cache `menu_reset_date`)

### 2. Staff Portal (MenuItems)

- [ ] Enable an item, set Qty (e.g. 30)
- [ ] Confirm: `units_today` updated via PUT `/portal/menu-items/{id}`
- [ ] Confirm: "Avail." / "On the line" equals Qty (no pending orders)
- [ ] Place an order, leave it pending
- [ ] Confirm: "Avail." / "On the line" = Qty minus reserved qty
- [ ] Complete the order
- [ ] Confirm: `units_today` decremented by order quantity

### 3. Customer Menu (Web)

- [ ] Visit `/menu`
- [ ] Confirm: sold-out items and qty=0 items are not addable
- [ ] Add to cart, go to checkout
- [ ] Confirm: inventory check passes (or fails if over available)
- [ ] Place order
- [ ] Confirm: cart cleared, order created

### 4. SMS / Messenger Chatbot

- [ ] Place order via chatbot
- [ ] Confirm: inventory check (ChatbotOrderService uses getVirtualAvailableForToday)
- [ ] Confirm: sold-out items rejected

### 5. Order Completion

- [ ] Complete an order from portal
- [ ] Confirm: `units_today` decremented for each order_item (OrdersController ~line 175)
- [ ] Confirm: available count drops on MenuItems page

### 6. Sold-Out Behavior

- [ ] Set Qty to 0 or mark sold out
- [ ] Confirm: customer menu blocks add-to-cart
- [ ] Confirm: chatbot rejects order for that item
- [ ] Confirm: CheckoutController blocks if cart exceeds available

---

## Touch Points (Reference)

| File | Type | What |
|------|------|------|
| MenuItemStockService | Read | virtual_available = units_today - reserved |
| OrdersController | Write | decrement units_today on completion |
| MenuItemsController | Read/Write | getVirtualAvailableForToday, update units_today |
| CustomerMenuController | Read | getVirtualAvailableForTodayAll, units_today sold-out check |
| CheckoutController | Read | getVirtualAvailableForToday before placing order |
| ChatbotOrderService | Read | getVirtualAvailableForToday before placing order |
| ChatbotWebhookController | Read | getVirtualAvailableForToday for state |
| FacebookMessengerWebhookController | Read | same |
| routes/console.php (menu:reset-today) | Write | reset units_today to 0 |
| MenuItems.jsx | UI | displays units_today (Qty), virtual_available (Avail.) |
| Menu.jsx | UI | available, units_today for sold-out and add-to-cart |

---

## Sign-Off

- [ ] All manual steps completed
- [ ] No unexpected behavior
- [ ] Ready for Phase 1 (Option A snapshot)
