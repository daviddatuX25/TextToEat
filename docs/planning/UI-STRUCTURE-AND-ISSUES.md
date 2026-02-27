# UI Structure & Issues Analysis

Analysis of the TextToEat app UI: navigation, home/dashboard, and related issues.

---

## 1. Current UI Structure

### Routes and pages (Inertia)

| Route | Page component | Layout | Notes |
|------|----------------|--------|--------|
| `/` | `Welcome.jsx` | AppLayout | Home / landing |
| `/login` | `Login.jsx` | **None** | Standalone card, full-screen |
| `/menu` | `Menu.jsx` | AppLayout, `showDashboard={false}` | Customer menu + cart |
| `/track` | `Track.jsx` | AppLayout | Placeholder only |
| `/checkout` | `Checkout.jsx` | AppLayout | Cart checkout |
| `/order-confirmation/:ref` | `OrderConfirmation.jsx` | AppLayout | Post-checkout |
| `/dashboard` | `Dashboard.jsx` | AppLayout | Staff only (auth) |
| `/dashboard/menu-items` | `Dashboard.jsx` | AppLayout | Same component, tab=menu |

### Layout: `AppLayout.jsx`

- **Desktop:** Fixed top bar (glass): Logo + tagline | **Nav links** (Home, Customer Menu, Track, [Dashboard if staff]) | Theme toggle | Log out or “Staff Login”.
- **Main content:** `<main className="mx-auto w-full max-w-7xl px-6 pt-28 pb-20">` wrapping `children`.
- **Mobile:** Nav links are in a block with `hidden md:flex` — **on small screens the main nav is not shown**, and there is **no hamburger or mobile menu**. Users only see logo, theme toggle, and Staff Login.

### Page roles

- **Customer-facing:** Home (Welcome), Menu, Track, Checkout, OrderConfirmation. Menu hides Dashboard link via `showDashboard={false}`.
- **Staff-only:** Dashboard (and Dashboard menu-items). Login is standalone.

---

## 2. Navigation Issues (“Navigation is still a mess”)

### 2.1 Mobile: no way to reach main pages

- The main nav (Home, Customer Menu, Track, Dashboard) is **hidden on viewports below `md`** (`hidden md:flex`).
- There is **no mobile menu** (no hamburger, no drawer/sheet).
- On phones, users **cannot navigate** to Home, Menu, or Track from the header; only the logo (goes to `/`) and Staff Login are usable.

**Recommendation:** Add a mobile nav (e.g. hamburger + sheet/dropdown) that shows the same links, or show a compact nav (e.g. icons + labels) on small screens.

### 2.2 Duplicate and inconsistent nav

- **AppLayout** shows: Home, Customer Menu, Track, [Dashboard if staff].
- **Welcome (home)** repeats a second nav in the body: Dashboard, Menu, Track, Staff login — with different labels (“Menu” vs “Customer Menu”, “Staff login” vs “Staff Login”) and no “Home”.
- So: two navigation surfaces, inconsistent naming, and the home page presents itself partly as a staff entry (Dashboard, Staff login) instead of a single clear primary nav.

**Recommendation:** Use one canonical nav in AppLayout; remove the duplicate nav from Welcome. Unify labels (e.g. “Menu” everywhere or “Customer Menu” everywhere).

### 2.3 No active state

- Nav links do not reflect the current route (no `router.page.url` / `usePage()` check, no active class).
- Users cannot see at a glance which section they’re in.

**Recommendation:** In AppLayout, compare `usePage().url` (or pathname) to each link and apply an active style (e.g. `text-primary-600 font-bold` or underline).

### 2.4 Naming and audience

- “Customer Menu” in the bar vs “Menu” in Welcome and in Dashboard (“Today’s Menu”).
- Home says “Staff dashboard for Lacasandile Eatery” and links to Dashboard/Staff login, so the **first thing visitors see is staff-oriented**, not a clear customer value prop.

**Recommendation:** Decide whether `/` is primarily for customers or staff. If customer-first: rewrite home copy and CTAs (e.g. “Order food”, “Browse menu”, “Track order”); keep staff entry as a secondary “Staff” or “Dashboard” link.

---

## 3. Home Page (“Dashboard page is not okay”)

### 3.1 Role and content

- **Welcome.jsx** currently:
  - Title: “TextToEat”
  - Subtitle: “Staff dashboard for Lacasandile Eatery”
  - In-page links: Dashboard, Menu, Track, Staff login
- So the **home page reads as an internal/staff landing**, not a public restaurant landing. There is no hero, no “order via SMS/Messenger/web”, no clear CTA to browse menu or track order.

### 3.2 Not a dashboard

- The **real** staff dashboard is `/dashboard` (Kitchen List, Today’s Menu, Messages, Sales). The home page is not that; it’s a minimal landing with staff-focused copy. Calling it or treating it as “the dashboard” is misleading; the only real dashboard is `/dashboard`.

**Recommendation:**  
- If home is **customer** landing: replace Welcome content with a short hero, value prop (order by text/web), and primary CTAs (e.g. “Browse today’s menu”, “Track your order”). Optionally a small “Staff” link in the main nav.  
- If home is **staff** landing: rename/reposition so it’s clearly “Staff” or “Back to dashboard” and make the main dashboard at `/dashboard` the single staff entry.

---

## 4. Other Issues

### 4.1 Track page

- **Track.jsx** is a placeholder: title “Track Order” and “Placeholder — Order lookup”. No form, no order lookup, no real UI.

### 4.2 Dashboard tabs: URL vs client-only

- **Kitchen List** and **Today’s Menu** are URL-backed: `/dashboard` and `/dashboard/menu-items` (different server routes, same Inertia component with different `tab`).
- **Messages** and **Sales Record** are client-only (`href: null`); they only switch local state. So:
  - Back button and bookmarking behave differently for Kitchen/Menu vs Messages/Sales.
  - No deep link to “Messages” or “Sales”.

Consider either: making all tabs URL-backed (e.g. `/dashboard?tab=messages`) or documenting that only Kitchen and Menu are “real” routes.

### 4.3 Checkout in main nav

- Checkout is not in the top nav. Users reach it from the Menu (cart → checkout). That’s reasonable; if you want “Cart” or “Checkout” in the bar when the cart is non-empty, that can be a follow-up.

### 4.4 Login layout

- Login uses no AppLayout (full-screen card). Fine for a dedicated auth page; ensure “Back to home” or “TextToEat” is obvious so users can return.

### 4.5 Footer

- There is no footer (no links, no contact, no branding). Optional but useful for a public-facing site.

---

## 5. Summary Table

| Area | Issue | Severity |
|------|--------|----------|
| Nav | No mobile menu; main links hidden on small screens | **High** |
| Nav | Duplicate nav on Welcome; inconsistent labels | Medium |
| Nav | No active state on nav links | Low |
| Home | Staff-focused copy; not a customer landing | **High** |
| Home | Not a dashboard; real dashboard is `/dashboard` | Medium |
| Track | Placeholder only; no order lookup UI | Medium |
| Dashboard | Mixed URL vs client-only tabs | Low |
| General | No footer | Low |

---

## 6. Suggested priority order

1. **Mobile nav:** Add hamburger (or equivalent) + sheet/dropdown so Home, Menu, Track (and Dashboard when staff) are reachable on small screens.
2. **Home page:** Redefine as customer landing (hero + CTAs) or explicit staff entry; remove duplicate nav and staff-only framing from the main landing unless it’s staff-only.
3. **Single nav in AppLayout:** Remove duplicate nav from Welcome; unify link labels; add active state from current route.
4. **Track:** Implement minimal order lookup (e.g. by reference or phone) or keep as “Coming soon” with clear messaging.
5. **Dashboard tabs:** Optionally make Messages/Sales URL-backed or document behavior; keep Kitchen and Menu as primary staff flows.

This document can be used as a checklist for UI/navigation cleanup and for any design or implementation tasks (e.g. Stitch, tickets, or PRs).
