# TextToEat Chatbot Phase — Implementation Plan

## Overview

This plan covers the **chatbot phase** of TextToEat: a deterministic, rule-based ordering flow over one messaging channel (v1 = SMS first), backed by a finite-state machine (FSM), webhooks, and persisted session state in PostgreSQL. It aligns with **TEXTTOEAT_SPECIFICATION.md §5 (Chatbot Design)** and **§8 (Data Model)**, and follows Metis v1 directives: one channel, FSM, no LLM, state in `chatbot_sessions`, acceptance via webhook + DB assertions, and a test mode that runs the FSM without live Twilio/SMS.

---

## Alignment with Specification

### §5 Chatbot Design

| Spec requirement | Plan |
|------------------|------|
| Deterministic, no LLM | FSM only; keyword matching via Fuse.js (score ≥ 80%); no AI/LLM. |
| Numbered menus | Primary input: numbers for menu selection, quantity, confirm. |
| Fuzzy keywords | Fuse.js: help, tao/person, menu, cancel, status. |
| Validation loop | Input → number? → selection; else Fuse match → keyword action; else localized fallback. |
| Languages | Tagalog, Ilocano, English via i18next; selection once per session, stored in `chatbot_sessions.language`. |
| Human takeover | Bot offers "talk to a person?"; if yes → escalate; staff use Messages UI to view/reply. |

### §8 Data Model

| Table | Use in chatbot phase |
|-------|----------------------|
| `chatbot_sessions` | Persist FSM state (JSON), channel, external_id, language. Single source of truth for session. |
| `conversations` | Human takeover threads; link to `chatbot_session_id`; status (e.g. open, closed). |
| `orders` | Orders created by chatbot; channel = sms (v1); status received → confirmed → ready → completed. |
| `order_items` | Line items; snapshot name/price; quantity; menu_item_id nullable. |
| `menu_items` | Source of truth for today's menu; units_today, is_sold_out, menu_date. |

Existing schema is used as-is; no in-memory-only state.

---

## Phases and Milestones

### Phase 1: Webhook + FSM backbone (no channel yet)

- **M1.1** Webhook route and controller accept POST payload (simulated inbound message).
- **M1.2** Session lookup/creation by channel + external_id; read/write `chatbot_sessions.state` (JSON).
- **M1.3** FSM implemented (PHP or same-repo service): states and transitions for welcome → language → menu → selection → confirm → order.
- **M1.4** Test mode: trigger FSM via POST to webhook with `channel`, `external_id`, `body`; no Twilio/Messenger. Acceptance: DB state changes and optional outbound payload in response or log.

### Phase 2: Menu, keywords, i18n

- **M2.1** FSM loads today's menu from `menu_items` (menu_date = today); responds with numbered list.
- **M2.2** Fuse.js (or PHP port/equivalent) keyword matching: help, menu, cancel, status, tao/person; trigger correct transition or reply.
- **M2.3** i18next (or PHP i18n) for Tagalog, Ilocano, English; language chosen once and stored in session; all bot messages localized.

### Phase 3: Order creation and idempotency

- **M3.1** On confirm, create `orders` (channel=sms, status=received) and `order_items` from session state; generate `reference`.
- **M3.2** Idempotency: same session + same “confirm” step produces at most one order (e.g. idempotency key in state or transition guard).

### Phase 4: Human takeover handoff

- **M4.1** FSM transition: user says “person”/tao or chooses “talk to person” → create/update `conversations` (chatbot_session_id, channel, external_id, status=open); session state marked as handed off.
- **M4.2** Staff Messages UI can list open conversations and reply (implementation of Messages UI may be same or separate milestone; see SCOPE-AND-RISKS.md).

### Phase 5: SMS channel (Twilio)

- **M5.1** Twilio webhook configured to POST to our webhook URL; map Twilio request to channel=sms, external_id=From (phone), body=Body.
- **M5.2** Outbound SMS: after FSM step, send reply via Twilio API (from Laravel or from a small outbound helper called by FSM).
- **M5.3** Acceptance: webhook + DB assertions only; no requirement for “user sends real SMS” in automated tests.

---

## Technical Approach

### One channel first (v1)

- **Channel:** SMS only (Twilio). Messenger and web chat are out of v1.
- **FSM:** Deterministic; same input + state always yields same transition and reply.

### State persistence

- **Where:** `chatbot_sessions.state` (JSON). Store: current FSM state name, selected language, selected items (e.g. [{menu_item_id, name, price, quantity}]), idempotency key for order creation, and any flags (e.g. human_takeover_requested).
- **Lookup:** By (channel, external_id). Create session on first message; update state after each transition.

### Webhook and FSM without live SMS

- **Inbound:** POST `/api/chatbot/webhook` (or similar) with body e.g. `{ "channel": "sms", "external_id": "+63...", "body": "1" }`.
- **Flow:** Controller loads/creates session, runs FSM with (current state, body, menu from DB), updates session state, creates order if confirm, returns or logs outbound message. No Twilio/Messenger required for this path.
- **Tests:** Hit webhook with curl/HTTP tests; assert `chatbot_sessions.state`, `orders`, `order_items`, `conversations` where applicable.

### Backend vs frontend

- **Backend (Laravel):** Webhook route and controller; FSM (in app or dedicated class); session load/save; menu read; order creation; conversation creation for takeover; Twilio client for outbound SMS (Phase 5). Optionally: `routes/api.php` for webhook so it’s not Inertia.
- **Frontend:** No change for v1 chatbot flow itself. Messages tab (human takeover queue) is staff UI: list conversations, show thread, send reply — can be same phase or follow-on (see SCOPE-AND-RISKS.md).

---

## API / Webhook Design

### Test / simulation endpoint (no live SMS)

- **Method:** POST  
- **URL:** e.g. `POST /api/chatbot/webhook` or `POST /api/chatbot/simulate`  
- **Body (JSON):**
  - `channel` (string): `"sms"` for v1  
  - `external_id` (string): e.g. phone number  
  - `body` (string): message content (e.g. "1", "menu", "help")  
  - Optional: `locale` for first message to seed language  
- **Response:** 200; body can include `reply` (text to “send” back) and/or `state` (current FSM state) for tests. No requirement to actually send SMS in test mode.

### Twilio webhook (Phase 5)

- **Method:** POST (Twilio sends form-encoded)  
- **URL:** Same or dedicated route, e.g. `POST /api/chatbot/twilio`  
- **Mapping:** From → external_id, Body → body, channel = sms. Then same FSM pipeline; outbound via Twilio API.

### Idempotency

- Use a key in `chatbot_sessions.state` (e.g. `last_order_id` or `confirm_at`) so that double “confirm” in same step does not create duplicate orders. Acceptance: two identical confirm requests in same state → one order.

---

## FSM States (Reference)

Suggested state names (implementer can refine):

1. **welcome** — Send welcome; transition to language_selection.  
2. **language_selection** — Parse 1/2/3 (or keywords); set language; go to menu.  
3. **menu** — Send numbered menu from `menu_items`; on number → item_selection; on “menu” → resend; on “help”/“tao”/etc. per keyword rules.  
4. **item_selection** — Quantity or next item; accumulate in state; then menu or confirm.  
5. **confirm** — Send summary; on confirm → create order, go to order_placed; on cancel → menu.  
6. **order_placed** — Send reference and thank you; optionally go back to menu or end.  
7. **human_takeover** — Conversation escalated; create/update `conversations`; bot no longer drives state.

Keyword handling (Fuse.js or equivalent): help, tao/person, menu, cancel, status — applied in relevant states; fallback message localized.

---

## Testing and Simulation Strategy

### Running FSM without live SMS/Messenger

1. **HTTP test mode:** Call `POST /api/chatbot/webhook` (or simulate) with JSON `{ "channel": "sms", "external_id": "test-user-1", "body": "..." }`.  
2. **No Twilio/Messenger:** No webhook registration to external providers required. Outbound “reply” can be returned in response or written to log for assertions.  
3. **Laravel tests:** Feature tests that POST to webhook, then assert:
   - `chatbot_sessions`: row exists, `state` JSON matches expected state name and payload.  
   - `orders` / `order_items`: created when FSM reaches confirm and user confirms.  
   - `conversations`: created when user requests human takeover.  
4. **Simulation script (optional):** Artisan command or script that sends a sequence of POSTs (e.g. welcome → "1" → "2" → "1" → confirm) and checks DB at the end.

### Laravel tests to add

- **Webhook acceptance:** POST with body "1", "2", "menu", "help", etc.; assert session state and, where applicable, order/conversation.  
- **Idempotency:** Two confirm requests in same state; assert single order.  
- **Session creation:** First message from new external_id creates `chatbot_sessions` row.  
- **Language and menu:** After language selection, state contains language; after menu step, reply contains menu items from `menu_items` for today.

**Acceptance criteria (executable):**

```bash
./vendor/bin/sail test --filter=ChatbotWebhook
# or
./vendor/bin/sail test tests/Feature/ChatbotWebhookTest.php
# Expected: All tests pass
```

No test must require a real SMS or Messenger message.

---

## Execution Order and Dependencies

| Order | Milestone | Depends on |
|-------|-----------|------------|
| 1 | M1.1–M1.4 | Existing schema, routes |
| 2 | M2.1–M2.3 | M1; menu_items, i18n |
| 3 | M3.1–M3.2 | M2; orders, order_items |
| 4 | M4.1–M4.2 | M3; conversations |
| 5 | M5.1–M5.3 | M4; Twilio credentials |

Backend tasks precede Twilio integration; frontend Messages UI can be parallel to M4 if scope includes it in this phase.

---

## File and Route References

- **Routes:** Add in `backend/routes/api.php` (create if missing) or `backend/routes/web.php` with prefix: e.g. `POST api/chatbot/webhook`, `POST api/chatbot/twilio`.  
- **Controllers:** e.g. `backend/app/Http/Controllers/ChatbotWebhookController.php` (receive, resolve session, run FSM, persist, return/log reply).  
- **FSM:** e.g. `backend/app/Chatbot/` or `backend/app/Services/ChatbotFsm.php` — state machine + keyword match + i18n.  
- **Models:** Use existing `ChatbotSession`, `Conversation`, `Order`, `OrderItem`, `MenuItem` (ensure they exist and match migrations).  
- **Tests:** `backend/tests/Feature/ChatbotWebhookTest.php` (or equivalent) for webhook and DB assertions.

---

## Summary

- **v1:** One channel (SMS), deterministic FSM, state in `chatbot_sessions`, no LLM.  
- **Acceptance:** Webhook POST + DB assertions; test mode without live Twilio/Messenger.  
- **Spec:** §5 (chatbot behavior, keywords, i18n, human takeover), §8 (tables and enums).  
- **Laravel:** Webhook route, FSM, session/order/conversation persistence, and `sail test` for chatbot feature tests.
