# TextToEat: System Specification

**For Lacasandile Eatery, Ilocos Sur**

*Single source of truth for implementation—synthesized from research manuscript and stakeholder conversations.*

---

## 1. Executive Summary

TextToEat is an SMS and Facebook Messenger–based order management system for Lacasandile Eatery. The system centers on a **deterministic chatbot** that handles ordering via familiar messaging platforms. Key design principles:

- **Simplicity first** — Prior interviews identified fear of adaptation as the main adoption barrier; system complexity is minimized.
- **Batch/turo-turo model** — Meals are cooked in advance; orders draw from pre-cooked portions.
- **Primary channels** — SMS and Messenger (chatbot); web is secondary.
- **Cash-based** — No digital payments; no official receipt issuance (BIR accreditation out of scope).
- **Single shared staff account** — One login for owner and staff; action logging for audit.

---

## 2. Operational Model

Lacasandile operates a **cook-first, order-later** (turo-turo/karinderia) model.

### 2.1 Flow

1. **Morning / pre-service** — Staff decide what to cook and prepare in batches.
2. **Service start** — Set today's menu with available units per item.
3. **Throughout the day** — Accept orders from available portions; fulfill by portioning and handing over.
4. **No cook-to-order** — Orders are not individually prepared; fulfillment is from pre-cooked batches.

### 2.2 Meal Availability

- Each menu item has **units** = servings available (e.g., "good for 5 orders").
- Unit = 1 serving.
- When units reach 0, item is **sold out for the day**.
- Staff can add units if more is cooked during the day.
- **Raw-ingredient inventory** is excluded; only meal-level availability is tracked.

---

## 3. Order Lifecycle

Order status flow:

| Status      | Meaning |
|------------|---------|
| **Received**  | Order entered into system; awaiting staff confirmation |
| **Confirmed** | Staff verified availability; order accepted |
| **Ready**     | Portioned and packed; ready for pickup/delivery |
| **Completed** | Handed over to customer |

No "Preparing" status — cooking is batch-based, not per order.

---

## 4. Channel Hierarchy

| Channel        | Role      | Use |
|----------------|-----------|-----|
| SMS            | Primary   | Customer orders via chatbot |
| Messenger      | Primary   | Customer orders via chatbot |
| Web (customer) | Secondary | Browse menu, place order, track |
| Web (staff)    | Primary   | Kitchen List, menu, human takeover, sales |

- All channels feed the same order queue.
- Web ordering is allowed but not emphasized.
- Staff see a unified view; channel (SMS/Messenger/Web) is metadata only.

---

## 5. Chatbot Design

### 5.1 Architecture

- **Deterministic** — No LLM/AI; rule-based flows.
- **Numbered menus** — Primary input (1, 2, 3).
- **Fuzzy keywords** — Fuse.js for typos and dialect variants.

### 5.2 Input Handling

1. **Numbers** — Menu selection, quantity, confirm, etc.
2. **Keywords** — Fuzzy match (score ≥ 80%): help, tao/person, menu, cancel, status.
3. **Fallback** — If unrecognized: guided message in user language.

### 5.3 Validation Loop

```
Input → Is number? → Use as selection
      → No → Fuse.js fuzzy match → Trigger keyword action
      → No match → Send localized fallback: "Sorry, I didn't understand. Please press number (1–5)."
```

### 5.4 Languages

- Tagalog, Ilocano, English via i18next.
- User selects once; stored in session.

### 5.5 Human Takeover

- Bot offers: "Would you like to talk to a person?"
- If yes → escalate to staff.
- Staff use Human Takeover interface to view and reply in the same channel (SMS or Messenger).

---

## 6. Staff Interface

Single dashboard with four areas:

| Tab            | Purpose |
|----------------|---------|
| **Kitchen List** | Order queue; recorded and shared; real-time sync; status updates |
| **Today's Menu** | Add, edit, remove menu items; set units per item; mark sold out |
| **Messages**     | Human takeover queue; view escalated conversations; reply |
| **Sales Record** | Completed orders; simple totals; no receipt issuance |

Today's Menu details:

- Staff can **add** menu items (name, price, category)
- Staff can **edit** name, price, category of existing items
- Staff can **remove** items from today's menu
- Set units per item; mark sold out

- **Order queue** — Persisted to DB; real-time updates; shared across staff.
- **Action logging** — Records who did what (implicit via shared account).

---

## 7. Technical Stack

*Aligned with this repository. Chatbot (SMS/Messenger) is a separate integration; same data model and APIs.*

| Layer           | Technology |
|-----------------|------------|
| Backend         | Laravel (API, routing, Inertia responses) |
| Runtime         | Sail — Docker (PHP, PostgreSQL, Node/Vite) |
| Database        | PostgreSQL |
| Staff UI        | React + Inertia — SPA-like, server-side routing |
| Build           | Vite |
| Styling         | TailwindCSS |
| UI components   | shadcn/ui (Radix, CVA, clsx, tailwind-merge), lucide-react |
| **Chatbot**     | *Separate service* — Twilio/Vonage (SMS), Facebook Messenger API; deterministic FSM, Fuse.js, i18next (to be built or integrated; consumes same `orders`, `menu_items`, `sessions`, `conversations`) |

---

## 8. Data Model

### 8.1 Tables

| Table          | Purpose |
|----------------|---------|
| `orders`       | Order header; channel, status, customer, total |
| `order_items`  | Line items; quantity, price |
| `menu_items`   | Menu with units_today, is_sold_out |
| `conversations`| Human takeover threads |
| `chatbot_sessions` | Chatbot session state, language (distinct from Laravel `sessions`) |
| `action_log`   | Audit of staff actions |

### 8.2 Order Status Enum

`received` | `confirmed` | `ready` | `completed`

### 8.3 Channel Enum

`sms` | `messenger` | `web`

---

## 9. Scope and Limitations

**In scope:**
- Chatbot-assisted ordering via SMS and Messenger.
- Web ordering (secondary).
- Kitchen List (recorded, shared).
- Meal availability with units.
- Human takeover.
- Simple sales record.
- Pickup and delivery.

**Out of scope:**
- Digital payment gateways.
- Official receipt issuance (BIR).
- Raw-ingredient inventory.
- Voice, image, or AI-based ordering.
- Multi-branch.
- Complex multi-user auth (single shared account only).

---

## 10. Manuscript Integration Notes

*For integration into Lopez Manuscript Chapter 1 and 2.*

| Section                    | Additions |
|---------------------------|-----------|
| **Background (Problem)**  | Prior interview: fear of adaptation as adoption bottleneck; complexity must be avoided |
| **Conceptual Framework**  | Batch model; meal availability with units; order queue recorded and shared; human takeover |
| **Scope**                 | Web as secondary; delivery; simple sales record; no receipt issuance; human takeover |
| **Limitations**           | No official receipt issuance (BIR); single shared staff account |
| **Methodology**           | Laravel + Inertia for web/staff; chatbot (FSM, Fuse.js, i18n) as separate integration |

**Recommended subsection:** "Operational Model and Business Flow" — batch/turo-turo model, order flow, meal availability, channel hierarchy.

---

## 11. Implementation Alignment (This Repo)

*What exists vs spec target. No prior karinderya-connect; greenfield Laravel + Inertia.*

| Component        | Current (this repo)                    | Target (spec) |
|------------------|----------------------------------------|---------------|
| Branding         | ✅ TextToEat, Lacasandile Eatery       | Lacasandile Eatery |
| Staff Dashboard  | Placeholder page; nav only             | Tabs: Kitchen List, Today's Menu, Messages, Sales |
| Order queue      | —                                      | Persisted; real-time sync; status: received → confirmed → ready → completed |
| OrderCard        | —                                      | Received, Confirmed, Ready, Completed |
| Today's Menu     | Placeholder "Customer Menu" page       | Staff: add/edit/remove items; units per item; sold out; name, price, category |
| Customer Menu    | Placeholder                            | Browse today's menu (from same menu_items) |
| Track Order      | Placeholder                            | Web lookup (secondary) |
| Messages         | —                                      | Human takeover queue; reply in channel |
| Sales Record     | —                                      | Completed orders; simple totals |
| Schema           | users, password_reset_tokens, sessions (Laravel default) | Add: orders, order_items, menu_items, conversations, chatbot_sessions, action_log; channel enum |
| Chatbot          | —                                      | Separate service; integrates via API/DB |

---

## 12. Current Codebase Scan (For Building Later)

*Snapshot of what exists and what to build. Use for prioritization and TDD slices.*

### 12.1 What Exists

| Location | Description |
|----------|-------------|
| `backend/` | Laravel app; Sail (Docker) |
| `backend/routes/web.php` | Routes: `/` (Welcome), `/dashboard`, `/menu`, `/track` — all Inertia placeholders |
| `backend/resources/js/Pages/Welcome.jsx` | TextToEat, Lacasandile Eatery, nav to Dashboard/Menu/Track |
| `backend/resources/js/Pages/Dashboard.jsx` | Staff Dashboard placeholder; copy mentions Kitchen List, Today's Menu, Messages, Sales |
| `backend/resources/js/Pages/Menu.jsx` | "Customer Menu" placeholder |
| `backend/resources/js/Pages/Track.jsx` | Track Order placeholder |
| `backend/database/migrations/` | Only default: `users`, `password_reset_tokens`, `sessions` (Laravel web sessions) |
| `backend/app/Models/` | `User.php` only |
| Stack (per .cursor/rules) | Laravel, Inertia, React, Vite, Tailwind, shadcn/ui, lucide-react; npm via Sail |

### 12.2 Schema To Add (Spec §8)

- `menu_items` — name, price, category, units_today, is_sold_out (and any date/scoping for "today")
- `orders` — channel (enum: sms, messenger, web), status (enum: received, confirmed, ready, completed), customer info, total, timestamps
- `order_items` — order_id, menu_item_id (or snapshot), quantity, price
- `chatbot_sessions` — channel, external_id (phone/page_id), language, state payload (e.g. JSON), timestamps
- `conversations` — human takeover threads; link to chatbot_sessions or channel identity; messages/replies
- `action_log` — staff action audit (user_id, action, model, id, timestamps)

### 12.3 Features To Build (Rough Order)

1. **Data model** — Migrations + Eloquent models for menu_items, orders, order_items; enums for status/channel.
2. **Today's Menu (staff)** — CRUD for menu items; set units; mark sold out. (Reuse or replace current Menu route for staff vs customer.)
3. **Kitchen List** — Order queue from DB; list orders with status; update status (received → confirmed → ready → completed); optional real-time (e.g. polling or Echo).
4. **Dashboard tabs** — Single staff dashboard with tabs: Kitchen List | Today's Menu | Messages | Sales.
5. **Customer menu (web)** — Public/today's menu from menu_items; add to cart; checkout (channel=web); create order.
6. **Track order (web)** — Lookup by order ref/phone; show status.
7. **Sales Record** — List completed orders; simple totals.
8. **Messages / Human takeover** — Conversations table + UI to view and reply (chatbot integration later).
9. **Chatbot service** — Separate codebase or module; talks to same DB/API; Twilio, Messenger, FSM, Fuse.js, i18n.

### 12.4 Conventions To Follow

- Run tests and npm via Sail: `./vendor/bin/sail test`, `./vendor/bin/sail npm run build`.
- TDD: red → green → refactor; one slice per goal in `.agent/goal.md`.
- UI: shadcn/ui + lucide-react; components under `resources/js/components/ui/`.

---

## Appendix A: IPO Conceptual Framework

```
Input:  Daily menu with units, pricing, customer orders (SMS, Messenger, Web)
Process: Chatbot FSM, numbered menus, fuzzy keywords, availability check,
         confirmation, human takeover, order persistence, real-time sync
Output: Kitchen List (recorded, shared), billing, meal availability,
        transaction logs, simple sales record
```

---

## Appendix B: System Architecture (Logic)

```
SMS / Messenger  →  Chatbot service (separate; FSM, Fuse.js, i18next)
                         ↓
Web (customer)   →  Laravel API (Inertia)  →  PostgreSQL  ←  Realtime
                         ↑
Staff Dashboard  ←  Kitchen List, Today's Menu, Messages, Sales (React + Inertia)
```

---
