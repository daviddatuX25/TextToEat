# Chatbot Phase — Scope, Risks, and Clarifications

## Scope Boundaries

### In scope (v1)

- **One channel:** SMS only (Twilio). No Messenger or web chat in v1.
- **Deterministic FSM:** Rule-based flow; numbered menus; Fuse.js (or equivalent) for fuzzy keywords (help, menu, cancel, status, tao/person).
- **State:** Persisted in `chatbot_sessions.state` (JSON). No in-memory-only state.
- **Order creation:** From FSM confirm step; idempotent; `orders` + `order_items`; menu source of truth from `menu_items`.
- **Human takeover:** Bot offers “talk to a person”; on yes, create/update `conversations` and hand off to staff.
- **Languages:** Tagalog, Ilocano, English (i18next or PHP i18n); selection once per session.
- **Testing:** Webhook POST + DB assertions; no requirement for real SMS in acceptance criteria.
- **Test mode:** Run FSM via POST to webhook with `channel`, `external_id`, `body`; no live Twilio/Messenger.

### Out of scope (v1)

- **LLM / AI:** No language models; no voice or image input.
- **Second channel:** No Messenger or other channel in v1.
- **Staff outbound replies:** Implementation of staff sending replies in the Messages UI may be same phase or follow-on (see clarifying questions).
- **Moderation, SLA, out-of-hours logic:** Not part of v1.
- **Deployment topology:** Whether chatbot runs in same repo or separate service is a clarification (see below).

---

## Risks (from Metis)

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Persistence** | State lost on restart or scale-out | Store all session state in `chatbot_sessions.state`; no server-local state. |
| **Idempotency** | Duplicate orders on double confirm | Guard in FSM (e.g. `last_order_id` or confirm-once flag in state); tests assert single order. |
| **Menu/order consistency** | Order created for sold-out or wrong price | Read menu from `menu_items` at confirm time; check units_today / is_sold_out; snapshot name/price in order_items. |
| **Human handoff** | Escalated user not visible to staff | Create `conversations` row with chatbot_session_id, channel, external_id, status=open; Messages UI lists by conversation. |
| **Credentials / compliance** | Twilio keys, PII in logs | Use Laravel config/env for Twilio; avoid logging message bodies or external_id in production; document compliance assumptions. |
| **Language** | Wrong language or missing keys | Store language in session; use i18n keys for all bot messages; test each locale in simulation. |
| **Latency** | Slow reply over SMS | Keep FSM fast; optional: queue outbound SMS so webhook returns quickly. |
| **Test mode** | Hard to test without live SMS | Provide POST webhook/simulate endpoint; acceptance tests use HTTP + DB only; document simulation flow. |

---

## Clarifying Questions for Product Owner

1. **First channel:** Confirm SMS first for v1 (Metis suggested SMS; Messenger is alternative).  
2. **Deployment:** Should the chatbot FSM and webhook live in this repo (Laravel) or in a separate service/codebase that shares DB/API?  
3. **Messages UI in this phase:** Should staff “Messages” (human takeover queue — view and reply) be implemented in the same release as the chatbot, or as an immediate follow-on?  
4. **Out-of-hours:** Any requirement for v1 (e.g. auto-reply “we’re closed”) or defer?  
5. **Message history:** Should we store full message history (e.g. a `messages` table with content, direction, timestamp) for conversations, or only conversation metadata and staff replies for now?

---

## Decisions Log (to fill as PO answers)

| Question | Decision |
|----------|----------|
| First channel | _SMS (assumed v1)_ |
| Same repo vs separate service | _TBD_ |
| Messages UI in phase | _TBD_ |
| Out-of-hours | _TBD_ |
| Store full message history | _TBD_ |

Once these are decided, update CHATBOT-PLAN.md (e.g. “Messages UI” in Phase 4) and any task breakdown accordingly.
