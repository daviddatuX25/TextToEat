# Work Plan: Chatbot Phase 2 (M2.1–M2.3)

## Overview

Implement Phase 2 of the TextToEat chatbot in `texttoeat-app`: **(M2.1)** load today’s menu from `menu_items` (menu_date = today) and respond with a numbered list; **(M2.2)** keyword matching (help, menu, cancel, status, tao/person) via PHP (exact + optional fuzzy), triggering the correct FSM transition or reply; **(M2.3)** i18n for Tagalog, Ilocano, and English using Laravel `lang/`, with language chosen once per session and all bot messages localized. The plan is scoped to Phase 2 only (no Twilio, no order creation idempotency from Phase 3, no conversation creation from Phase 4). Bot replies are server-side; PHP `lang/` is used for all outgoing messages.

**Key constraints (from context):**

- Menu source: `MenuItem` model, `menu_date`, `units_today`, `is_sold_out` per existing migration and spec.
- Session: `ChatbotSession` has `state` (JSON) and `language` (string, default `en`). State already includes `selected_language`; use it for every outgoing reply.
- FSM: `app/Chatbot/ChatbotFsm.php` — currently placeholder menu and English/Spanish/French; must switch to real menu, keywords, and en/tl/ilo.
- Webhook: `ChatbotWebhookController` calls FSM and persists state; must pass menu and locale into FSM.
- Tests: `tests/Feature/ChatbotWebhookTest.php` — extend for menu-from-DB, keywords, and i18n; acceptance: `./vendor/bin/sail test` passes including chatbot tests.

---

## Key Decisions

| Decision | Rationale |
|----------|------------|
| **Menu loaded in controller, passed into FSM** | Controller loads `MenuItem::whereDate('menu_date', today())` (and optionally filters `is_sold_out`). FSM receives a list of menu items (or a pre-built numbered string) so it stays pure and testable without DB. |
| **Keyword matching in PHP** | Avoid Node/Fuse.js in Laravel. Use exact match for known tokens (help, menu, cancel, status, tao, person) plus optional fuzzy fallback via `similar_text()` with ≥80% score for typos; implement in FSM or a small `ChatbotKeywordMatcher` class. |
| **i18n via Laravel `lang/`** | Bot replies are server-side; use `__('chatbot.key', [], $locale)` with locale from `state['selected_language'] ?? session->language ?? 'en'`. Create `lang/en/chatbot.php`, `lang/tl/chatbot.php`, `lang/ilo/chatbot.php`. |
| **Locale codes** | Use `en` (English), `tl` (Tagalog), `ilo` (Ilocano). Language selection: 1=English, 2=Tagalog, 3=Ilocano; persist to both `state['selected_language']` and `ChatbotSession.language`. |
| **Keyword “tao/person” in Phase 2** | Trigger transition to `human_takeover` and localized reply only; do **not** create `conversations` row (that is Phase 4). |

---

## Tasks

### Task 1: Add today’s menu query and pass menu into FSM

**Description:**  
Introduce a way to load today’s menu in the webhook controller and pass it into the FSM. Add a scope or static helper on `MenuItem` for “today’s menu” (menu_date = today, optionally exclude sold-out). Controller loads this list and passes it to `ChatbotFsm::transition()`. FSM signature is extended to accept an optional “menu” argument (e.g. array of `{id, name, price}` or Eloquent models); when present, FSM uses it to build the numbered menu string and to resolve item numbers to ids/names. When absent (e.g. in tests), FSM can keep placeholder or empty menu behavior for backward compatibility during transition.

**Files affected:**

- `texttoeat-app/app/Models/MenuItem.php` — Add scope `scopeForToday($query)` or static method that returns items where `menu_date = today`, ordered by id (or name), optionally `where('is_sold_out', false)`.
- `texttoeat-app/app/Chatbot/ChatbotFsm.php` — Extend `transition()` to accept an optional 4th parameter `$menuItems` (array of objects with at least `id`, `name`, `price`). In `fromLanguageSelection`, `fromMenu`, `fromItemSelection`, `fromOrderPlaced`, and any state that sends the menu or validates item numbers, use this list to build the numbered menu text and map body numbers to items. Remove or replace `PLACEHOLDER_MENU` usage when `$menuItems` is provided. Format: one line per item as `{n}. {name} - {price}` (price formatted as currency).
- `texttoeat-app/app/Http/Controllers/ChatbotWebhookController.php` — Before calling the FSM, load today’s menu via `MenuItem::forToday()->get()` (or equivalent), convert to array of `['id' => ..., 'name' => ..., 'price' => ...]`, and pass into `$fsm->transition(..., $menuItems)`.

**Dependencies:** None.

**Acceptance criteria:**

```bash
# From project root
cd /home/sarmi/projects/texttoeat-v2/texttoeat-app && ./vendor/bin/sail test tests/Feature/ChatbotWebhookTest.php
# Expected: All tests pass (existing tests may be updated in later tasks; this task must not break them)
```

- Manual or test: With at least one `menu_items` row for today’s date, POST to webhook with body that reaches `menu` state; reply must contain a numbered list built from that row (not placeholder Pizza/Burger/Salad).

---

### Task 2: Implement PHP keyword matcher (help, menu, cancel, status, tao, person)

**Description:**  
Implement keyword detection in PHP: exact match for `help`, `menu`, `cancel`, `status`, `tao`, `person`. Optionally add fuzzy matching using `similar_text($input, $keyword, $percent)` and treat as match when `$percent >= 80` for any of the keywords. Prefer a small dedicated class or private methods in the FSM so that the logic is reusable and testable. Input should be normalized (trim, lower case) before matching.

**Files affected:**

- `texttoeat-app/app/Chatbot/ChatbotKeywordMatcher.php` (new) — Class with a method e.g. `match(string $body): ?string` that returns the matched keyword (e.g. `'help'`, `'menu'`, `'cancel'`, `'status'`, `'tao'`) or null. Keywords list: help, menu, cancel, status, tao, person. Implement exact match first; then for each keyword compute `similar_text($bodyLower, $keyword, $pct)` and if `$pct >= 80` return that keyword. For “tao” and “person”, both can return the same intent (e.g. `'tao'` or `'person'`) so that the FSM can trigger the same transition.
- `texttoeat-app/app/Chatbot/ChatbotFsm.php` — In states `menu`, `item_selection`, `confirm` (and optionally `language_selection` for “help” only), before treating body as a number or “done”/“yes”/“no”, call the keyword matcher. If a keyword is matched, perform the corresponding action: **help** → stay in current state, set reply to localized help text; **menu** → transition to `menu` (or resend menu in place) and clear any in-progress selection in payload; **cancel** → transition to `menu`, clear `selected_items`; **status** → stay in state, reply with localized “no order yet” (or later order status); **tao/person** → transition to `human_takeover`, reply with localized “human will assist” message. Do not create a `conversations` record (Phase 4).

**Dependencies:** Task 1 (FSM already receives menu and state; keyword handling fits into same flow).

**Pattern reference:** Logic similar to `fromConfirm` in `ChatbotFsm.php` (body checks before numeric) and existing state structure.

**Acceptance criteria:**

- Unit or feature test: Input “help” in `menu` state returns help reply and stays in `menu`. Input “menu” in `item_selection` returns to `menu` state with menu text. Input “cancel” in `confirm` returns to `menu` with cleared selection. Input “tao” or “person” transitions to `human_takeover` with appropriate reply.
- Optional: Input “helpp” (typo) with fuzzy match ≥80% is treated as “help”.

---

### Task 3: Add Laravel lang files for chatbot (en, tl, ilo)

**Description:**  
Create Laravel translation files for all chatbot messages so that every user-facing reply is localized. Use locale codes `en`, `tl` (Tagalog), `ilo` (Ilocano). Add a single file per locale: `lang/en/chatbot.php`, `lang/tl/chatbot.php`, `lang/ilo/chatbot.php`. Each file returns an array of keys used by the FSM (e.g. welcome, language_prompt, invalid_language, menu_header, menu_footer, added_item, done_empty, confirm_prompt, order_placed, cancel_ok, help_text, status_none, human_takeover_reply, invalid_option, etc.). Include all strings currently hardcoded in `ChatbotFsm.php` and any new strings for keyword replies. For dynamic parts (e.g. item name, list of items), use placeholders in the translation string (e.g. `:name`, `:list`).

**Files affected:**

- `texttoeat-app/lang/en/chatbot.php` (new) — English strings.
- `texttoeat-app/lang/tl/chatbot.php` (new) — Tagalog strings (same keys as en).
- `texttoeat-app/lang/ilo/chatbot.php` (new) — Ilocano strings (same keys as en).

**Dependencies:** None (can be done in parallel with Task 1/2).

**Acceptance criteria:**

- All keys used in the FSM exist in `lang/en/chatbot.php`. Tagalog and Ilocano files have the same keys; values can be placeholder translations initially if needed, but keys must be complete so that `__('chatbot.key', [], 'tl')` and `__('chatbot.key', [], 'ilo')` do not return the key.

---

### Task 4: Wire FSM to use session language and Laravel translations

**Description:**  
Use the session’s selected language for every FSM reply. Controller passes the current locale into the FSM (from `$state['selected_language'] ?? $session->language ?? 'en'`). FSM uses this locale in every `__('chatbot.xxx', $replace, $locale)` call so that replies are in the user’s language. Update language selection in the FSM to use 1=English (en), 2=Tagalog (tl), 3=Ilocano (ilo) and store the chosen code in state and, when saving session, persist to `ChatbotSession.language` so the session model has the language for future requests.

**Files affected:**

- `texttoeat-app/app/Chatbot/ChatbotFsm.php` — Add a `$locale` parameter to `transition()` (e.g. 5th argument or a dedicated parameter after state payload). Replace every hardcoded reply string with `__('chatbot.key', $replace, $locale)`. In `fromWelcome`, use translated language prompt (“1=English, 2=Tagalog, 3=Ilocano” or equivalent key). In `fromLanguageSelection`, set `selected_language` to `en`/`tl`/`ilo` per 1/2/3. Ensure all states that produce a reply use the same `$locale`.
- `texttoeat-app/app/Http/Controllers/ChatbotWebhookController.php` — Before calling the FSM, compute `$locale = $state['selected_language'] ?? $session->language ?? 'en'`. Pass `$locale` into `$fsm->transition(..., $locale)`. After the FSM returns, if the new state payload contains `selected_language`, set `$session->language = $newState['selected_language']` before saving the session so the DB column stays in sync.

**Dependencies:** Task 3 (lang files exist). Task 1 (signature of transition may already include menu; add locale in same or prior task).

**Acceptance criteria:**

- After sending “1” (English) in language_selection, subsequent replies are in English. After sending “2” (Tagalog), subsequent replies use Tagalog strings. Same for “3” (Ilocano). Session row has `language` set to the chosen code after language selection.
- No hardcoded English (or other) reply strings remain in the FSM; all go through `__('chatbot....', [], $locale)`.

---

### Task 5: Format numbered menu from menu_items and handle empty menu

**Description:**  
Ensure the FSM builds the numbered menu string only from the passed-in `$menuItems` (today’s menu). When `$menuItems` is empty, reply with a localized “no menu available for today” message and stay in a sensible state (e.g. remain in `menu` or show message and stay in `menu`). When non-empty, format each item as “{n}. {name} - {price}” with price formatted (e.g. 2 decimals, currency symbol if in lang). Sold-out handling: controller may pass only non–sold-out items (filter in `MenuItem::forToday()` scope or in controller); document that sold-out items are excluded from the list. Ensure `fromMenu` and `fromItemSelection` validate the user’s number against the 1-based index of the passed menu (not a fixed list).

**Files affected:**

- `texttoeat-app/app/Chatbot/ChatbotFsm.php` — In states that build the menu text, use only `$menuItems`. Add a helper (private method) that builds the numbered string from `$menuItems` and returns it, or build inline. When `$menuItems` is empty, return localized message “No menu available today” (or similar key) and do not list items. In `fromMenu` and `fromItemSelection`, map body number to item by index (1-based) in `$menuItems` and store in state something like `selected_items` as array of `{menu_item_id, name, price, quantity}` (quantity 1 when adding from menu; aggregate in item_selection).
- `texttoeat-app/app/Models/MenuItem.php` — If not done in Task 1: ensure scope excludes `is_sold_out = true` when desired (or document that controller filters).

**Dependencies:** Task 1, Task 3, Task 4.

**Acceptance criteria:**

- When there are no menu items for today, webhook reply in menu state contains the localized “no menu” message.
- When there are menu items for today, reply contains exactly those items in numbered format; selecting by number adds the correct item (by id/name/price) to the session state.

---

### Task 6: Add or update Laravel feature tests for Phase 2 (M2)

**Description:**  
Add or update feature tests so that M2.1, M2.2, and M2.3 are covered and all chatbot tests pass under `sail test`. Tests must use the webhook POST; assert on `reply` and `chatbot_sessions.state` (and optionally `chatbot_sessions.language`). Cover: (1) Today’s menu: seed `menu_items` with `menu_date = today`, go to menu state, assert reply contains seeded item names and prices in numbered form. (2) Keywords: in menu or confirm state, send “help”, “menu”, “cancel”, “status”, “tao”/“person” and assert correct state and reply. (3) i18n: after choosing language 2 or 3, send a message that triggers a known reply and assert the reply matches the expected Tagalog or Ilocano string (or assert locale in state and that reply is not the default English). Fix existing tests that expect old language codes (es, fr) or placeholder menu text so they expect en/tl/ilo and real or empty menu as appropriate.

**Files affected:**

- `texttoeat-app/tests/Feature/ChatbotWebhookTest.php` — Add tests: e.g. `test_menu_state_returns_todays_menu_from_database`, `test_keyword_help_returns_help_reply`, `test_keyword_menu_returns_to_menu_state`, `test_keyword_cancel_clears_selection_and_returns_to_menu`, `test_keyword_tao_or_person_transitions_to_human_takeover`, `test_after_language_2_replies_use_tagalog` (or assert reply contains a Tagalog key from lang). Update `test_webhook_after_language_choice_transitions_to_menu` to expect `selected_language` to be `en` for body “1” and to work with new menu/locale behavior. Ensure `test_webhook_validates_required_fields` still passes.

**Dependencies:** Tasks 1–5.

**Acceptance criteria:**

```bash
cd /home/sarmi/projects/texttoeat-v2/texttoeat-app && ./vendor/bin/sail test tests/Feature/ChatbotWebhookTest.php
# Expected: All tests pass
```

```bash
cd /home/sarmi/projects/texttoeat-v2/texttoeat-app && ./vendor/bin/sail test
# Expected: Full test suite passes (including ChatbotWebhookTest)
```

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Empty menu when no rows for today | User sees “no menu” instead of placeholder; tests may fail if they expect items | Task 5 defines empty-menu behavior; tests seed today’s `menu_items` when testing menu content. |
| Fuzzy match false positives | Unintended keyword trigger | Use threshold 80% and prefer exact match first; test edge cases. |
| Missing or wrong locale code (tl/ilo) | Laravel may not find lang file | Use `lang/tl/chatbot.php` and `lang/ilo/chatbot.php`; Laravel accepts any folder name under `lang/`. If Laravel expects different code, use `fil` for Tagalog only if `tl` fails. |
| FSM signature change breaks callers | Controller or tests fail | Extend signature with optional/defaulted parameters; keep backward compatibility in tests until updated. |

---

## Execution Notes

- **Order:** Task 1 and Task 3 can be done in parallel. Task 2 can start after or in parallel with Task 1 (keyword matcher is independent of menu content). Task 4 depends on Task 3. Task 5 depends on Task 1, 3, 4. Task 6 should be last and depends on all others.
- **Suggested sequence:** 1 → (2, 3 in parallel) → 4 → 5 → 6. Alternatively: 1 → 2 → 3 → 4 → 5 → 6.
- **Verification:** After each task, run `./vendor/bin/sail test tests/Feature/ChatbotWebhookTest.php`. Final gate: `./vendor/bin/sail test` passes.
- **No Phase 3/4/5:** Do not implement order creation, idempotency, `conversations` creation, or Twilio; keyword “tao”/“person” only transitions to `human_takeover` and replies.

---

## File Reference Summary

| Path | Purpose |
|------|---------|
| `texttoeat-app/docs/planning/chatbot/CHATBOT-PLAN.md` | Spec §5, FSM states, keywords, i18n. |
| `texttoeat-app/docs/planning/chatbot/SCOPE-AND-RISKS.md` | Scope and risks. |
| `texttoeat-app/app/Chatbot/ChatbotFsm.php` | FSM: states, transitions, placeholder menu (to be replaced). |
| `texttoeat-app/app/Http/Controllers/ChatbotWebhookController.php` | Webhook: session load/save, FSM call. |
| `texttoeat-app/app/Models/MenuItem.php` | Model with menu_date, units_today, is_sold_out. |
| `texttoeat-app/app/Models/ChatbotSession.php` | state (JSON), language. |
| `texttoeat-app/database/migrations/0001_01_01_000003_create_menu_items_table.php` | menu_date, units_today, is_sold_out. |
| `texttoeat-app/database/migrations/0001_01_01_000007_create_chatbot_sessions_table.php` | channel, external_id, language, state. |
| `texttoeat-app/tests/Feature/ChatbotWebhookTest.php` | Current webhook tests. |
| `texttoeat-app/routes/api.php` | POST /api/chatbot/webhook. |

---

## Acceptance Criteria (Overall)

- **M2.1:** FSM uses today’s menu from `menu_items` (menu_date = today); reply is a numbered list; MenuItem model and scope used as specified.
- **M2.2:** Keywords help, menu, cancel, status, tao/person matched (PHP, exact + optional fuzzy ≥80%); correct transition/reply per spec.
- **M2.3:** Tagalog, Ilocano, English via Laravel `lang/`; language chosen once per session; all bot messages localized using session language.
- **Tests:** `./vendor/bin/sail test` passes, including `ChatbotWebhookTest` with new/updated cases for menu, keywords, and i18n.
