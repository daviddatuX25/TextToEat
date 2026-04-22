# TextToEat UI & Logic Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 14 targeted improvements across Today's Menu, Dashboard/Analytics, Navigation, Rollover/Reset, and User Management — all in the `texttoeat-app/` Laravel + Inertia + React codebase.

**Architecture:** Frontend is React (JSX) with Inertia.js for SPA routing and server-driven props. Backend is Laravel with `UsersController`, `MenuItemsController`, `MenuSettingsController`, and `AnalyticsController`. Tests use Pest/PHPUnit in `tests/Feature/`.

**Tech Stack:** PHP 8 / Laravel, React 18, Inertia.js, Recharts, Tailwind CSS, Lucide icons, Pest

---

> **Scope note:** These 5 groups are independent subsystems. If you want to parallelise, they can each be worked on separately. This plan treats them as one deliverable because every change is small (< 30 lines).

---

## File Map

| File | Changed in Task(s) |
|------|-------------------|
| `texttoeat-app/resources/js/Pages/MenuItems.jsx` | 1, 2, 3 |
| `texttoeat-app/app/Http/Controllers/MenuItemsController.php` | 2 |
| `texttoeat-app/tests/Feature/MenuItemAutoReplenishTest.php` | 2 (new) |
| `texttoeat-app/resources/js/Pages/Dashboard.jsx` | 4 |
| `texttoeat-app/resources/js/components/dashboard/RevenueChart.jsx` | 5 |
| `texttoeat-app/resources/js/Pages/Analytics.jsx` | 6, 7 |
| `texttoeat-app/resources/js/Layouts/PortalLayout.jsx` | 8, 9 |
| `texttoeat-app/resources/js/Layouts/AppLayout.jsx` | 9 |
| `texttoeat-app/resources/js/Pages/MenuSettings.jsx` | 10 |
| `texttoeat-app/resources/js/Pages/Users.jsx` | 11 |
| `texttoeat-app/app/Http/Controllers/UsersController.php` | 11 |
| `texttoeat-app/tests/Feature/UsersRoleHierarchyTest.php` | 11 (new) |

---

## GROUP 1 — Today's Menu: UI & Inventory Logic

---

### Task 1: Rename "Enable" → "Replenish"

**Files:**
- Modify: `texttoeat-app/resources/js/Pages/MenuItems.jsx`

- [ ] **Step 1: Find the two "Enable" occurrences to change**

  In `MenuItemCard` (~line 300), the toggle button shows:
  ```jsx
  {soldOut ? 'Enable' : 'Sold out'}
  ```
  In `EnableForTodayDialog` (~line 175), the dialog title and submit button both say "Enable".

- [ ] **Step 2: Rename button label in `MenuItemCard`**

  Locate the toggle button in `MenuItemCard`. Change:
  ```jsx
  {soldOut ? 'Enable' : 'Sold out'}
  ```
  to:
  ```jsx
  {soldOut ? 'Replenish' : 'Sold out'}
  ```

- [ ] **Step 3: Rename `EnableForTodayDialog` title and submit button**

  Change the `DialogTitle`:
  ```jsx
  // before
  <DialogTitle>Enable for today</DialogTitle>
  // after
  <DialogTitle>Replenish for today</DialogTitle>
  ```
  Change the submit `<Button>`:
  ```jsx
  // before
  <Button type="submit">Enable</Button>
  // after
  <Button type="submit">Replenish</Button>
  ```

- [ ] **Step 4: Verify no other "Enable" label remains on the Today's Menu page**

  Run:
  ```bash
  grep -n "Enable" texttoeat-app/resources/js/Pages/MenuItems.jsx
  ```
  Expected: only `onEnableClick` (function name) remains — no user-visible "Enable" strings.

- [ ] **Step 5: Run existing tests to confirm no regression**

  ```bash
  cd texttoeat-app && php artisan test --filter MenuItemStock
  ```
  Expected: all tests pass.

- [ ] **Step 6: Commit**

  ```bash
  git add texttoeat-app/resources/js/Pages/MenuItems.jsx
  git commit -m "feat: rename Enable button to Replenish on Today's Menu"
  ```

---

### Task 2: Auto-Replenish Logic (zero → any quantity = auto-enable)

**Files:**
- Modify: `texttoeat-app/resources/js/Pages/MenuItems.jsx`
- Modify: `texttoeat-app/app/Http/Controllers/MenuItemsController.php`
- Create: `texttoeat-app/tests/Feature/MenuItemAutoReplenishTest.php`

- [ ] **Step 1: Write the failing test**

  Create `texttoeat-app/tests/Feature/MenuItemAutoReplenishTest.php`:
  ```php
  <?php

  use App\Models\MenuItem;
  use App\Models\MenuItemDailyStock;
  use App\Models\User;
  use Carbon\Carbon;

  it('auto-clears is_sold_out when units_today is increased from zero', function () {
      $admin = User::factory()->create(['role' => 'admin']);
      $item = MenuItem::factory()->create(['is_sold_out' => true, 'price' => 50]);
      MenuItemDailyStock::factory()->create([
          'menu_item_id' => $item->id,
          'menu_date' => Carbon::today(),
          'units_set' => 0,
          'units_sold' => 0,
          'units_leftover' => 0,
      ]);

      $response = $this->actingAs($admin)
          ->put("/portal/menu-items/{$item->id}", ['units_today' => 10]);

      $response->assertRedirect();
      $item->refresh();
      expect($item->is_sold_out)->toBeFalse();
  });

  it('does not change is_sold_out when units_today stays at zero', function () {
      $admin = User::factory()->create(['role' => 'admin']);
      $item = MenuItem::factory()->create(['is_sold_out' => true, 'price' => 50]);

      $this->actingAs($admin)
          ->put("/portal/menu-items/{$item->id}", ['units_today' => 0]);

      $item->refresh();
      expect($item->is_sold_out)->toBeTrue();
  });
  ```

- [ ] **Step 2: Run the test to confirm it fails**

  ```bash
  cd texttoeat-app && php artisan test --filter MenuItemAutoReplenishTest
  ```
  Expected: FAIL — `is_sold_out` stays `true` even when units increase.

- [ ] **Step 3: Implement the backend logic**

  In `texttoeat-app/app/Http/Controllers/MenuItemsController.php`, inside the `update()` method, after the `units_today` stock block, add auto-clear:

  ```php
  // Auto-clear sold-out when stock is replenished from zero
  if (array_key_exists('units_today', $validated) && (int) $validated['units_today'] > 0) {
      $menuItem->update(['is_sold_out' => false]);
      $validated['is_sold_out'] = false;
  }
  ```

  Place this block *before* the `$menuItem->update($validated)` call, inside the `if (array_key_exists('units_today', $validated))` block that already exists.

  Full updated block in `update()`:
  ```php
  if (array_key_exists('units_today', $validated)) {
      $set = (int) $validated['units_today'];
      $today = Carbon::today();
      $stock = MenuItemDailyStock::query()
          ->where('menu_item_id', $menuItem->id)
          ->whereDate('menu_date', $today)
          ->first();
      if ($stock) {
          $stock->update([
              'units_set' => $set,
              'units_leftover' => max(0, $set - (int) $stock->units_sold),
          ]);
      } else {
          MenuItemDailyStock::create([
              'menu_item_id' => $menuItem->id,
              'menu_date' => $today,
              'units_set' => $set,
              'units_sold' => 0,
              'units_leftover' => $set,
          ]);
      }
      // Auto-replenish: going from 0 → positive clears sold-out flag
      if ($set > 0) {
          $validated['is_sold_out'] = false;
      }
  }

  $menuItem->update($validated);
  ```

- [ ] **Step 4: Run the test to confirm it passes**

  ```bash
  cd texttoeat-app && php artisan test --filter MenuItemAutoReplenishTest
  ```
  Expected: 2 tests PASS.

- [ ] **Step 5: Update the frontend — send `is_sold_out: false` optimistically**

  In `MenuItems.jsx`, find the `setQuantity` function inside `MenuItemCard`:
  ```jsx
  const setQuantity = (newVal) => {
      const n = Math.max(0, Math.floor(Number(newVal)));
      if (n === units || !routerImpl?.put) return;
      routerImpl.put(`/portal/menu-items/${item.id}`, { units_today: n }, { preserveScroll: true });
  };
  ```
  Change to:
  ```jsx
  const setQuantity = (newVal) => {
      const n = Math.max(0, Math.floor(Number(newVal)));
      if (n === units || !routerImpl?.put) return;
      const payload = { units_today: n };
      if (n > 0 && soldOut) payload.is_sold_out = false;
      routerImpl.put(`/portal/menu-items/${item.id}`, payload, { preserveScroll: true });
  };
  ```

- [ ] **Step 6: Run full test suite to confirm no regression**

  ```bash
  cd texttoeat-app && php artisan test
  ```
  Expected: all existing tests pass + 2 new tests pass.

- [ ] **Step 7: Commit**

  ```bash
  git add texttoeat-app/resources/js/Pages/MenuItems.jsx \
          texttoeat-app/app/Http/Controllers/MenuItemsController.php \
          texttoeat-app/tests/Feature/MenuItemAutoReplenishTest.php
  git commit -m "feat: auto-replenish item when quantity increased from zero"
  ```

---

### Task 3: Add Price Editing to "Edit Menu Item" Modal

**Files:**
- Modify: `texttoeat-app/resources/js/Pages/MenuItems.jsx`

`UpdateMenuItemRequest` already has `'price' => ['sometimes', 'numeric', 'min:0']` — no backend change needed.

- [ ] **Step 1: Add `price` to `EditMenuItemDialog` form state**

  Find `EditMenuItemDialog`. In the `useForm(...)` call, add `price`:
  ```jsx
  const form = useForm({
      name: item?.name ?? '',
      price: item?.price ?? '',       // ← add this
      category_id: item?.category_id ?? categories[0]?.id ?? '',
      image: null,
      remove_image: false,
  });
  ```

- [ ] **Step 2: Sync `price` when item changes**

  In the `useEffect` that re-syncs form on `open` / `item?.id` change, add `price`:
  ```jsx
  form.setData({
      name: item.name ?? '',
      price: item.price ?? '',         // ← add this
      category_id: item.category_id ?? categories[0]?.id ?? '',
      image: null,
      remove_image: false,
  });
  ```

- [ ] **Step 3: Add the Price input field in the form JSX**

  In the form body, add the `Input` field immediately after the Name field:
  ```jsx
  <Input
      id="edit_price"
      label="Price (₱)"
      type="number"
      step="0.01"
      min="0"
      required
      value={form.data.price}
      onChange={(e) => form.setData('price', e.target.value)}
      error={form.errors.price}
  />
  ```

- [ ] **Step 4: Verify the `submit` function includes price in the payload**

  In `EditMenuItemDialog.submit()`, the existing code does `const payload = { ...form.data, _method: 'PUT' }`. Since `price` is now in `form.data`, it will be included automatically — no extra change needed. Confirm `price` is not in any destructured `unset` call.

- [ ] **Step 5: Manually test in browser**

  Open `/portal/menu-items`, click Edit on any item, confirm the price field is present and pre-filled, change the price, save. Verify the new price appears on the card.

- [ ] **Step 6: Commit**

  ```bash
  git add texttoeat-app/resources/js/Pages/MenuItems.jsx
  git commit -m "feat: add price field to Edit Menu Item modal"
  ```

---

## GROUP 2 — Dashboard & Analytics Refinement

---

### Task 4: Rename Dashboard Metrics ("Revenue by type" and "Average order value")

**Files:**
- Modify: `texttoeat-app/resources/js/Pages/Dashboard.jsx`

- [ ] **Step 1: Rename "Revenue by type" card header**

  Find the card header text (around line 134 in Dashboard.jsx):
  ```jsx
  <p className="text-sm font-semibold text-primary-900 dark:text-primary-100">
      Revenue by type
  </p>
  ```
  Change to:
  ```jsx
  <p className="text-sm font-semibold text-primary-900 dark:text-primary-100">
      Revenue by Hour
  </p>
  ```

- [ ] **Step 2: Rename "Average order value" StatCard label**

  Find the StatCard (around line 175):
  ```jsx
  <StatCard
      label="Average order value"
      value={formatCurrency(avg_order_value_today)}
      helperText="Revenue ÷ completed"
      className="!p-3 col-span-2"
  />
  ```
  Change `label` to:
  ```jsx
  label="Average Spend per Order"
  ```

- [ ] **Step 3: Verify Analytics page already uses correct terminology**

  Run:
  ```bash
  grep -n "AOV\|Avg spend\|Average order" texttoeat-app/resources/js/Pages/Analytics.jsx
  ```
  Expected output: line 264 shows `"Avg spend per order"` — already correct, no change needed.

- [ ] **Step 4: Commit**

  ```bash
  git add texttoeat-app/resources/js/Pages/Dashboard.jsx
  git commit -m "feat: rename Revenue by type → Revenue by Hour, AOV → Average Spend per Order"
  ```

---

### Task 5: Remove Dots from "Revenue by Hour" Line Chart

**Files:**
- Modify: `texttoeat-app/resources/js/components/dashboard/RevenueChart.jsx`

- [ ] **Step 1: Set `dot={false}` on all three `<Line>` elements**

  Find the three `<Line>` components (around lines 87-89):
  ```jsx
  <Line type="monotone" dataKey="walkin" name="walkin" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
  <Line type="monotone" dataKey="delivery" name="delivery" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
  <Line type="monotone" dataKey="pickup" name="pickup" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
  ```
  Change all three `dot={{ r: 3 }}` to `dot={false}`:
  ```jsx
  <Line type="monotone" dataKey="walkin" name="walkin" stroke="#8b5cf6" strokeWidth={2} dot={false} />
  <Line type="monotone" dataKey="delivery" name="delivery" stroke="#f97316" strokeWidth={2} dot={false} />
  <Line type="monotone" dataKey="pickup" name="pickup" stroke="#f59e0b" strokeWidth={2} dot={false} />
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add texttoeat-app/resources/js/components/dashboard/RevenueChart.jsx
  git commit -m "fix: remove dots from Revenue by Hour line chart"
  ```

---

### Task 6: Fix Pie Chart Label Clipping

**Files:**
- Modify: `texttoeat-app/resources/js/Pages/Analytics.jsx`

The `AnalyticsPieDonut` component (line 747) uses `outerRadius="68%"` with small margins `{ top: 4, right: 4, bottom: 4, left: 4 }`. Labels render outside the SVG viewport and get clipped by the card's overflow boundary.

- [ ] **Step 1: Reduce `outerRadius` and increase `PieChart` margins**

  Find `AnalyticsPieDonut` (line 747–774). Change:
  ```jsx
  <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
      <Pie
          ...
          outerRadius="68%"
          ...
      >
  ```
  to:
  ```jsx
  <PieChart margin={{ top: 24, right: 40, bottom: 24, left: 40 }}>
      <Pie
          ...
          outerRadius="55%"
          ...
      >
  ```

- [ ] **Step 2: Verify overflow-visible is set on the parent cards**

  Confirm that the two donut cards have `overflow-visible`:
  ```bash
  grep -n "overflow-visible" texttoeat-app/resources/js/Pages/Analytics.jsx | head -5
  ```
  Expected: lines 351 and 366 already have `overflow-visible` — no change needed.

- [ ] **Step 3: Commit**

  ```bash
  git add texttoeat-app/resources/js/Pages/Analytics.jsx
  git commit -m "fix: fix pie chart label clipping by reducing outerRadius and adding margins"
  ```

---

### Task 7: Analytics Cleanup (remove 3 cards, relocate Export CSV)

**Files:**
- Modify: `texttoeat-app/resources/js/Pages/Analytics.jsx`

Remove: "How customers get orders" (lines 366–380), "Payment tracking" (lines 381–425), "Rising this period" (lines 516–559). The Export CSV `<a>` tag lives inside "Payment tracking" — move it to just below the snapshot row before that card disappears.

- [ ] **Step 1: Extract the Export CSV button before removing Payment tracking**

  Locate the export anchor (around line 417–423 inside the Payment tracking card):
  ```jsx
  <a
      href={exportUrl}
      className="inline-flex items-center gap-2 rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-700 transition"
  >
      <Download className="h-4 w-4" />
      Export sales (CSV)
  </a>
  ```

  Add this button **after the snapshot row** (after the `</div>` that closes the `grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5` block, around line 288). Wrap it in a `<div className="flex justify-end">`:
  ```jsx
  <div className="flex justify-end">
      <a
          href={exportUrl}
          className="inline-flex items-center gap-2 rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-700 transition"
      >
          <Download className="h-4 w-4" />
          Export sales (CSV)
      </a>
  </div>
  ```

- [ ] **Step 2: Remove the 3-column grid section entirely**

  The entire block starting at `{/* Two donuts + Payment health + Export */}` (line 349) through to the closing `</div>` (line 426) is a `grid min-w-0 gap-6 lg:grid-cols-3` containing three cards. Replace the whole block with just the single "Orders by platform" card (no grid wrapper needed):

  ```jsx
  <Card className="rounded-2xl border-surface-200 dark:border-surface-700 overflow-visible min-w-0">
      <CardHeader className="border-b border-surface-200 dark:border-surface-700 pb-2">
          <p className="text-sm font-semibold text-surface-800 dark:text-surface-100 flex items-center gap-2">
              Orders by platform
              <MetricInfoDialog {...ANALYTICS_METRIC_HELP.ordersByChannel} />
          </p>
      </CardHeader>
      <CardContent className="pt-4 overflow-visible">
          {channelDonutData.length > 0 && totalOrders > 0 ? (
              <AnalyticsPieDonut data={channelDonutData} />
          ) : (
              <div className="flex min-h-[200px] items-center justify-center text-sm text-surface-500 dark:text-surface-400">No orders in range.</div>
          )}
      </CardContent>
  </Card>
  ```

- [ ] **Step 3: Remove "Rising this period" card, make "Falling this period" full-width**

  Find the `<div className="grid gap-6 lg:grid-cols-2">` (line 516) that wraps Rising + Falling. Remove the entire Rising card (lines 516–559). Change the grid wrapper from `lg:grid-cols-2` to no grid (just a plain `<div>`), and make the Falling card full-width:

  ```jsx
  {/* Falling this period — full width after Rising removed */}
  <Card className="rounded-2xl border-surface-200 dark:border-surface-700 overflow-hidden">
      <CardHeader className="border-b border-surface-200 dark:border-surface-700">
          <p className="text-sm font-semibold text-surface-800 dark:text-surface-100 flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4 text-rose-500" />
              Falling this period
          </p>
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 flex items-center gap-1.5">
              Vs previous period of same length
              <MetricInfoDialog
                  {...ANALYTICS_METRIC_HELP.risingFalling}
                  contentEn={`${ANALYTICS_METRIC_HELP.risingFalling.contentEn}${previousPeriodExtraEn}`}
                  contentFil={`${ANALYTICS_METRIC_HELP.risingFalling.contentFil}${previousPeriodExtraFil}`}
              />
          </p>
      </CardHeader>
      <CardContent className="pt-4">
          {risingFalling.falling?.length > 0 ? (
              <ul className="space-y-2">
                  {risingFalling.falling.map((r) => (
                      <li key={r.name} className="flex justify-between text-sm">
                          <span className="font-medium text-surface-800 dark:text-surface-100">{r.name}</span>
                          <span className="text-rose-600 dark:text-rose-400">{r.delta} units</span>
                      </li>
                  ))}
              </ul>
          ) : (
              <div className="space-y-2">
                  <p className="text-sm text-surface-500 dark:text-surface-400">No falling items.</p>
                  {rfSummary && rfSummary.items_compared > 0 && (
                      <p className="text-xs text-surface-400 dark:text-surface-500 leading-relaxed">
                          Summary for {rfSummary.items_compared} item{rfSummary.items_compared === 1 ? '' : 's'}: {rfSummary.rising_count} sold more,{' '}
                          {rfSummary.flat_count} unchanged, {rfSummary.falling_count} sold fewer than in the previous period.
                      </p>
                  )}
                  {(!rfSummary || rfSummary.items_compared === 0) && (
                      <p className="text-xs text-surface-400 dark:text-surface-500 leading-relaxed">
                          No completed order lines in this range and the prior period to compare.
                      </p>
                  )}
              </div>
          )}
      </CardContent>
  </Card>
  ```

- [ ] **Step 4: Remove unused imports**

  After removing Payment tracking, `payment_health` is no longer rendered. Remove it from the `sales` destructure (line 90):
  ```jsx
  // remove: payment_health = { paid: 0, unpaid: 0, total_completed: 0 },
  ```
  Also remove `ArrowUpCircle` from the lucide import at the top (line 29) since "Rising" is gone.
  Remove `fulfillmentDonutData` and `totalFulfillment` variables (lines 119–121) since "How customers get orders" is gone:
  ```jsx
  // remove these two lines:
  const fulfillmentDonutData = by_fulfillment.map(...);
  const totalFulfillment = fulfillmentDonutData.reduce(...);
  ```
  Remove `by_fulfillment` from the `sales` destructure (line 89).

- [ ] **Step 5: Run build to confirm no unused-variable errors**

  ```bash
  cd texttoeat-app && npm run build 2>&1 | tail -20
  ```
  Expected: build succeeds with no errors.

- [ ] **Step 6: Commit**

  ```bash
  git add texttoeat-app/resources/js/Pages/Analytics.jsx
  git commit -m "feat: analytics cleanup — remove How customers get orders, Payment Tracking, Rising This Period"
  ```

---

## GROUP 3 — Navigation & Global UI

---

### Task 8: Nav Label "Today's servings" → "Today's Menu"

**Files:**
- Modify: `texttoeat-app/resources/js/Layouts/PortalLayout.jsx`

- [ ] **Step 1: Update the nav item label**

  In `PortalLayout.jsx`, find `PORTAL_NAV_GROUP_MENU` definition (around line 54):
  ```jsx
  { href: '/portal/menu-items', label: "Today's servings", Icon: BookOpen, badgeKey: 'low_stock_meals' },
  ```
  Change to:
  ```jsx
  { href: '/portal/menu-items', label: "Today's Menu", Icon: BookOpen, badgeKey: 'low_stock_meals' },
  ```

- [ ] **Step 2: Update daily greeting dialog button text**

  In `PortalLayout.jsx`, find the daily greeting `Dialog` (around line 400). The button reads:
  ```jsx
  <Button onClick={handleDismissGreeting}>Open today&apos;s servings</Button>
  ```
  Change to:
  ```jsx
  <Button onClick={handleDismissGreeting}>Open today&apos;s menu</Button>
  ```
  Also update the dialog message body for consistency:
  ```jsx
  // before:
  Today&apos;s servings were reset to zero. Set quantities again to open ordering for the day.
  // after:
  Today&apos;s menu was reset to zero. Set quantities again to open ordering for the day.
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add texttoeat-app/resources/js/Layouts/PortalLayout.jsx
  git commit -m "feat: rename Today's servings → Today's Menu in nav and daily greeting"
  ```

---

### Task 9: Logout Confirmation Modal

**Files:**
- Modify: `texttoeat-app/resources/js/Layouts/PortalLayout.jsx`
- Modify: `texttoeat-app/resources/js/Layouts/AppLayout.jsx`

Both layouts have logout buttons that call `router.post('/logout')` directly. Add a confirmation dialog to each.

- [ ] **Step 1: Add logout confirmation state to `PortalLayout`**

  At the top of the `PortalLayout` component (inside the function, with other `useState` declarations), add:
  ```jsx
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  ```

- [ ] **Step 2: Add the `LogoutConfirmDialog` JSX to `PortalLayout`**

  Place the dialog just before the closing `</div>` of the main layout wrapper:
  ```jsx
  <Dialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
      <DialogContent className="max-w-sm">
          <DialogHeader>
              <DialogTitle>Log out?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-surface-600 dark:text-surface-400">
              You will be signed out of the portal.
          </p>
          <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setLogoutConfirmOpen(false)}>
                  Cancel
              </Button>
              <Button className="flex-1" onClick={() => { setLogoutConfirmOpen(false); router.post('/logout'); }}>
                  Log out
              </Button>
          </div>
      </DialogContent>
  </Dialog>
  ```

- [ ] **Step 3: Wire all logout buttons in `PortalLayout` to open the dialog**

  There are two logout buttons in `SidebarContent` — they both call `router.post('/logout')` inline. Since `SidebarContent` is a sub-component, pass `onLogoutClick` as a prop.

  Update `SidebarContent` signature:
  ```jsx
  function SidebarContent({ navEntries, pathname, onNavClick, iconOnly, navBadges, isAdmin, isSuperAdmin, onLogoutClick }) {
  ```

  Find both logout buttons in `SidebarContent` and change `onClick`:
  ```jsx
  // icon-only button
  onClick={onLogoutClick}

  // full sidebar button
  onClick={onLogoutClick}
  ```
  Both buttons currently have inline `onClick={() => router.post('/logout')}` — replace with `onClick={onLogoutClick}`.

  Pass the prop from `PortalLayout` where `SidebarContent` is rendered:
  ```jsx
  <SidebarContent
      ...
      onLogoutClick={() => setLogoutConfirmOpen(true)}
  />
  ```

- [ ] **Step 4: Add logout confirmation to `AppLayout`**

  In `AppLayout.jsx`, add state:
  ```jsx
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  ```

  Add import for `Dialog` at the top (it already imports from `@inertiajs/react` — add the Dialog import):
  ```jsx
  import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Dialog';
  ```

  Change both logout buttons (desktop nav + mobile menu) from:
  ```jsx
  onClick={() => router.post('/logout')}
  ```
  to:
  ```jsx
  onClick={() => setLogoutConfirmOpen(true)}
  ```

  Add the dialog at the end of the returned JSX, before the closing wrapper `</div>`:
  ```jsx
  <Dialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
      <DialogContent className="max-w-sm">
          <DialogHeader>
              <DialogTitle>Log out?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-surface-600 dark:text-surface-400">
              You will be signed out.
          </p>
          <div className="flex gap-2 pt-4">
              <button
                  type="button"
                  onClick={() => setLogoutConfirmOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-surface-200 dark:border-surface-600 text-surface-700 dark:text-surface-300 font-medium text-sm"
              >
                  Cancel
              </button>
              <button
                  type="button"
                  onClick={() => { setLogoutConfirmOpen(false); router.post('/logout'); }}
                  className="flex-1 py-2 rounded-xl bg-primary-600 text-white font-semibold text-sm hover:bg-primary-700"
              >
                  Log out
              </button>
          </div>
      </DialogContent>
  </Dialog>
  ```

- [ ] **Step 5: Run build**

  ```bash
  cd texttoeat-app && npm run build 2>&1 | tail -10
  ```
  Expected: no errors.

- [ ] **Step 6: Commit**

  ```bash
  git add texttoeat-app/resources/js/Layouts/PortalLayout.jsx \
          texttoeat-app/resources/js/Layouts/AppLayout.jsx
  git commit -m "feat: add logout confirmation dialog to portal and public nav"
  ```

---

## GROUP 4 — System Logic: Rollover & Resets

---

### Task 10: Simplify MenuSettings — Always-on Reset, Remove Window Config

**Files:**
- Modify: `texttoeat-app/resources/js/Pages/MenuSettings.jsx`

The goal: remove the rollover window hour form (from/until fields) and the "outside window" workaround link, so "Reset menu now" is always enabled. Keep: auto-reset toggle + hour, last reset date, the confirmation dialog (simplified — remove the "allow outside window" checkbox). Preserve the "Also cancel stale unfulfilled orders" option as it's genuinely useful.

- [ ] **Step 1: Remove `reset_morning_from_hour` and `reset_morning_until_hour` from state and form**

  In `MenuSettings`, find `menuResetForm` state (around line 37):
  ```jsx
  const [menuResetForm, setMenuResetForm] = useState({
      reset_morning_from_hour: menu?.reset_morning_from_hour ?? 0,
      reset_morning_until_hour: menu?.reset_morning_until_hour ?? 11,
      auto_reset_enabled: !!menu?.auto_reset_enabled,
      auto_reset_at_hour: menu?.auto_reset_at_hour ?? menu?.reset_morning_until_hour ?? 4,
  });
  ```
  Change to:
  ```jsx
  const [menuResetForm, setMenuResetForm] = useState({
      auto_reset_enabled: !!menu?.auto_reset_enabled,
      auto_reset_at_hour: menu?.auto_reset_at_hour ?? 4,
  });
  ```

- [ ] **Step 2: Update the `useEffect` that syncs form from props**

  Find the `useEffect` for `menuResetForm` (around line 56). Replace:
  ```jsx
  setMenuResetForm({
      reset_morning_from_hour: menu?.reset_morning_from_hour ?? 0,
      reset_morning_until_hour: menu?.reset_morning_until_hour ?? 11,
      auto_reset_enabled: !!menu?.auto_reset_enabled,
      auto_reset_at_hour: menu?.auto_reset_at_hour ?? menu?.reset_morning_until_hour ?? 4,
  });
  ```
  With:
  ```jsx
  setMenuResetForm({
      auto_reset_enabled: !!menu?.auto_reset_enabled,
      auto_reset_at_hour: menu?.auto_reset_at_hour ?? 4,
  });
  ```

- [ ] **Step 3: Update `saveMenuResetSettings` to only send the remaining fields**

  Find `saveMenuResetSettings` (around line 96). Replace the `router.patch` payload:
  ```jsx
  router.patch('/portal/menu-settings', {
      menu: {
          auto_reset_enabled: menuResetForm.auto_reset_enabled,
          auto_reset_at_hour: Number(menuResetForm.auto_reset_at_hour),
      },
  }, ...);
  ```

- [ ] **Step 4: Remove the `manualResetWithinWindow` guard from the "Reset menu now" button**

  Find (around line 273):
  ```jsx
  <Button
      type="button"
      variant="outline"
      disabled={!manualResetWithinWindow}
      onClick={() => {
          setResetDialogForce(false);
          setResetDialogOpen(true);
      }}
      ...
  >
  ```
  Change to (always enabled, no force flag needed):
  ```jsx
  <Button
      type="button"
      variant="outline"
      onClick={() => setResetDialogOpen(true)}
      className="gap-2"
  >
      <RefreshCw className="h-4 w-4" />
      Reset menu now
  </Button>
  ```
  Remove the entire `{!manualResetWithinWindow && (...)}` link and the amber warning paragraph below it.

- [ ] **Step 5: Remove the "Allow menu rollover outside window" checkbox from the reset dialog**

  In the `Dialog` for reset (around line 305), find and remove the entire `<div className="flex items-center gap-3 pt-2">` block that contains the `reset_force` checkbox (the "Allow menu rollover outside the configured window" option). Also remove `resetDialogForce` state and its setter — it's no longer needed.

  Also remove the `force` field from the `runReset()` call:
  ```jsx
  router.post(RUN_RESET_URL, {
      // remove: force: resetDialogForce ? 1 : 0,
      cancel_previous_unfulfilled: resetDialogCancelUnfulfilled ? 1 : 0,
  }, ...);
  ```

- [ ] **Step 6: Remove the rollover window form fields from the JSX**

  In the `saveMenuResetSettings` form, remove the entire `<div>` block containing "Manual menu rollover window" with From/Until inputs (around lines 210–240 of the form JSX). Keep only:
  - Auto-reset checkbox toggle
  - Auto-reset hour input (shown when enabled)
  - Save button

- [ ] **Step 7: Clean up now-unused variables**

  Remove from the component:
  - `manualResetWithinWindow` and `manualResetWindowLabel` (lines ~340–342)
  - `resetDialogForce` state and `setResetDialogForce`
  - `Clock` from the lucide import (if no longer used)

- [ ] **Step 8: Run build**

  ```bash
  cd texttoeat-app && npm run build 2>&1 | tail -10
  ```
  Expected: no errors.

- [ ] **Step 9: Verify reset sets stock to zero**

  Check `MenuSettingsController::runReset()` sets `units_leftover = 0`:
  ```bash
  grep -n "units_leftover\|units_set\|is_sold_out" texttoeat-app/app/Http/Controllers/MenuSettingsController.php
  ```
  Expected: the reset method updates `MenuItemDailyStock` with `units_leftover = 0` and `units_set = 0`. If it does NOT, add:
  ```php
  MenuItemDailyStock::query()
      ->whereDate('menu_date', Carbon::today())
      ->update(['units_set' => 0, 'units_leftover' => 0]);
  ```

- [ ] **Step 10: Commit**

  ```bash
  git add texttoeat-app/resources/js/Pages/MenuSettings.jsx
  git commit -m "feat: simplify menu reset — always-on button, remove rollover window config"
  ```

---

## GROUP 5 — User Management & Permissions

---

### Task 11: Fix "Add User" Button + Admin Can Create Staff & Co-Admins

**Files:**
- Modify: `texttoeat-app/resources/js/Pages/Users.jsx`
- Modify: `texttoeat-app/app/Http/Controllers/UsersController.php`
- Create: `texttoeat-app/tests/Feature/UsersRoleHierarchyTest.php`

The current code shows the role dropdown only to `isSuperAdmin`. An admin cannot assign roles. The fix: admins can also see the dropdown with `staff` and `admin` options (not `superadmin`). Backend must allow admins to set `staff` or `admin` role.

- [ ] **Step 1: Write the failing tests**

  Create `texttoeat-app/tests/Feature/UsersRoleHierarchyTest.php`:
  ```php
  <?php

  use App\Models\User;

  it('admin can create a staff user', function () {
      $admin = User::factory()->create(['role' => 'admin']);

      $response = $this->actingAs($admin)->post('/portal/users', [
          'username' => 'newstaff',
          'name' => 'New Staff',
          'password' => 'Password1!',
          'password_confirmation' => 'Password1!',
          'role' => 'staff',
      ]);

      $response->assertRedirect();
      $this->assertDatabaseHas('users', ['username' => 'newstaff', 'role' => 'staff']);
  });

  it('admin can create a co-admin user', function () {
      $admin = User::factory()->create(['role' => 'admin']);

      $response = $this->actingAs($admin)->post('/portal/users', [
          'username' => 'newadmin',
          'name' => 'New Admin',
          'password' => 'Password1!',
          'password_confirmation' => 'Password1!',
          'role' => 'admin',
      ]);

      $response->assertRedirect();
      $this->assertDatabaseHas('users', ['username' => 'newadmin', 'role' => 'admin']);
  });

  it('admin cannot create a superadmin user', function () {
      $admin = User::factory()->create(['role' => 'admin']);

      $this->actingAs($admin)->post('/portal/users', [
          'username' => 'badsuperadmin',
          'password' => 'Password1!',
          'password_confirmation' => 'Password1!',
          'role' => 'superadmin',
      ]);

      $this->assertDatabaseMissing('users', ['username' => 'badsuperadmin']);
  });

  it('staff cannot access the users page', function () {
      $staff = User::factory()->create(['role' => 'staff']);

      $this->actingAs($staff)->get('/portal/users')->assertForbidden();
  });
  ```

- [ ] **Step 2: Run tests to confirm they fail**

  ```bash
  cd texttoeat-app && php artisan test --filter UsersRoleHierarchyTest
  ```
  Expected: "admin can create co-admin" and "admin cannot create superadmin" FAIL.

- [ ] **Step 3: Update `UsersController::store()` to allow admin to set staff/admin roles**

  In `texttoeat-app/app/Http/Controllers/UsersController.php`, find the `store` method and change the role-assignment block:
  ```php
  // before:
  $role = 'staff';
  if ($request->user()->isSuperAdmin()) {
      $role = $validated['role'] ?? 'staff';
  }

  // after:
  $role = 'staff';
  $canAssignRole = $request->user()->isAdmin() || $request->user()->isSuperAdmin();
  if ($canAssignRole) {
      $requestedRole = $validated['role'] ?? 'staff';
      // Admins (non-superadmin) may not assign superadmin
      if ($requestedRole === 'superadmin' && !$request->user()->isSuperAdmin()) {
          $requestedRole = 'staff';
      }
      $role = $requestedRole;
  }
  ```

- [ ] **Step 4: Run tests to confirm they pass**

  ```bash
  cd texttoeat-app && php artisan test --filter UsersRoleHierarchyTest
  ```
  Expected: all 4 tests PASS.

- [ ] **Step 5: Update `Users.jsx` to show role dropdown for all admins (not just superadmin)**

  In `Users.jsx`, find the role `<select>` block (around line 145):
  ```jsx
  {isSuperAdmin && (
      <label className="block">
          <span ...>Role</span>
          <select value={form.data.role} onChange={...}>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
          </select>
      </label>
  )}
  ```
  Change condition from `{isSuperAdmin && ...}` to `{isAdmin && ...}`:
  ```jsx
  {isAdmin && (
      <label className="block">
          <span className="text-sm font-semibold text-surface-700 dark:text-surface-300">Role</span>
          <select
              value={form.data.role}
              onChange={(e) => form.setData('role', e.target.value)}
              className="mt-1 w-full rounded-lg border-2 border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
          >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
          </select>
      </label>
  )}
  ```

  Also confirm `isAdmin` is already destructured at the top of `Users`:
  ```jsx
  const isSuperAdmin = auth?.user?.role === 'superadmin';
  const isAdmin = auth?.user?.is_admin === true;  // this should already exist
  ```
  If `isAdmin` is not present, add it.

- [ ] **Step 6: Fix the `handleSubmit` role inclusion for all admins**

  In `handleSubmit` (around line 32), the `payload` only includes `role` when `isSuperAdmin`. Change to include role when `isAdmin`:
  ```jsx
  const handleSubmit = (e) => {
      e.preventDefault();
      const payload = {
          username: form.data.username,
          name: form.data.name,
          password: form.data.password,
          password_confirmation: form.data.password_confirmation,
      };
      if (isAdmin) {
          payload.role = form.data.role;
      }
      form.transform(() => payload).post('/portal/users', {
          onSuccess: () => {
              form.reset();
              setAddOpen(false);
          },
      });
  };
  ```

- [ ] **Step 7: Run full test suite**

  ```bash
  cd texttoeat-app && php artisan test
  ```
  Expected: all tests pass.

- [ ] **Step 8: Commit**

  ```bash
  git add texttoeat-app/resources/js/Pages/Users.jsx \
          texttoeat-app/app/Http/Controllers/UsersController.php \
          texttoeat-app/tests/Feature/UsersRoleHierarchyTest.php
  git commit -m "feat: allow admins to create staff and co-admin users"
  ```

---

## Self-Review

### Spec Coverage

| Requirement | Task | Covered? |
|---|---|---|
| Rename "Enable" → "Replenish" | Task 1 | ✅ |
| Auto-replenish on qty > 0 | Task 2 | ✅ |
| Price editing in Edit modal | Task 3 | ✅ |
| Rename "Revenue by type" → "Revenue by Hour" | Task 4 | ✅ |
| Rename "AOV" → "Average Spend per Order" | Task 4 | ✅ |
| Remove dots from Revenue by Hour chart | Task 5 | ✅ |
| Fix pie chart label overlap | Task 6 | ✅ |
| Remove "How customers get orders" | Task 7 | ✅ |
| Remove "Payment Tracking" | Task 7 | ✅ |
| Remove "Rising this period" | Task 7 | ✅ |
| Nav label "Today's servings" → "Today's Menu" | Task 8 | ✅ |
| Logout confirmation modal | Task 9 | ✅ |
| Rollover accessible outside window | Task 10 | ✅ |
| Remove Rollover Window / Reset modals clutter | Task 10 | ✅ |
| Reset sets all stock to 0 | Task 10 (step 9) | ✅ |
| Fix Add User button | Task 11 | ✅ |
| Admin can add Staff and Co-Admins | Task 11 | ✅ |

### Placeholder Scan

None — all code blocks contain real class names, actual file paths, and exact prop names from the codebase.

### Type Consistency

- `form.data.price` in `EditMenuItemDialog` — matches `UpdateMenuItemRequest` validation key `price` ✅
- `payload.is_sold_out = false` in `setQuantity` — matches the `UpdateMenuItemRequest` `is_sold_out: ['sometimes', 'boolean']` rule ✅
- `isAdmin` in `Users.jsx` — sourced from `auth?.user?.is_admin` (same pattern used in `PortalLayout.jsx`) ✅
- `auto_reset_enabled` and `auto_reset_at_hour` remain in `menuResetForm` — match existing backend setting keys ✅
