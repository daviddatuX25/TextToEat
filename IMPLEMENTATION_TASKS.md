# Number-Free Templates: Implementation Task Breakdown

One file per task. Each task small enough to implement and verify independently. Do not start Task N+1 until Task N is verified.

---

## Task 1 — Layer Input: normalize cart_menu / edit_action

**What:** Extend `normalizeBodyForChoiceState` to accept `item_selection_mode` in context. When `currentState === 'item_selection'` and mode is `cart_menu`, map 1→add, 2→view_cart, 3→edit, 4→confirm. When mode is `edit_action`, map 1→change_quantity, 2→remove, 3→back.

**Files:** `ChatbotSmsNumberLayer.php`, `ChatbotWebhookController.php` (pass `item_selection_mode` in context)

**Verify before moving on:** Write a unit test. Send `body='1'` with `currentState='item_selection'` and `item_selection_mode='cart_menu'` → layer returns `'add'`. Send `body='4'` → returns `'confirm'`. Send `body='2'` with mode `edit_action` → returns `'remove'`. All pass before touching anything else.

---

## Task 2 — FSM Input: remove CART_MENU_CANONICAL and EDIT_ACTION_CANONICAL

**What:** Remove raw number parsing from `fromItemSelection`. FSM now only checks for canonicals: add, view_cart, edit, confirm, done, change_quantity, remove, back. Remove the `$bodyLower === '4'` branch — layer already maps `'4'` to `'confirm'` from Task 1.

**Files:** `ChatbotFsm.php`

**Verify before moving on:** Run existing FSM tests. Manually trace: layer sends `'confirm'` → FSM handles it correctly. No raw number branches remain in `fromItemSelection`.

**Dependency:** Task 1 must be done and verified first.

---

## Task 3 — Config + Lang: new keys

**What:** Add `cart_menu` and `edit_action` to `choice_state_options` in `config/chatbot.php`. Add `cart_option_*`, `edit_option_*`, `cart_footer_suffix`, `cart_edit_action_intro`, `cart_invalid_prefix` to `reply_overridable_keys`. Add all new keys to all three lang files (en, tl, ilo).

**Files:** `config/chatbot.php`, `lang/en/chatbot.php`, `lang/tl/chatbot.php`, `lang/ilo/chatbot.php`

**Verify before moving on:** Run `ChatbotReplyConfigTest` — all new `label_key` values in `choice_state_options` must exist in `reply_overridable_keys`. All new lang keys exist in all three locales.

**Dependency:** None. Can be done in parallel with Task 1 and 2.

---

## Task 4 — FSM Output: replace footer/options with placeholders

**What:** In `buildCartSummary`, replace `$this->r('cart_footer', $locale)` with `'__CART_FOOTER__'` (skip entirely when `$channel === 'messenger'`). In `fromItemSelection` edit_action branch, replace `cart_edit_action_prompt` with `$intro . ' __EDIT_ACTION_OPTIONS__'`. In cart invalid branch, replace `cart_invalid_option` with `$this->r('cart_invalid_prefix', $locale) . "\n\n" . '__CART_FOOTER__'`.

**Files:** `ChatbotFsm.php`

**Verify before moving on:** FSM output for SMS/Web cart contains `__CART_FOOTER__` literally. FSM output for Messenger cart contains no footer and no placeholder. FSM output for edit_action contains `__EDIT_ACTION_OPTIONS__` literally.

**Dependency:** Task 3 (lang keys must exist before `r()` calls work).

---

## Task 5 — Layer Output: replace placeholders with numbered text

**What:** Add `formatCartFooterOptions($locale)` and `formatEditActionOptions($locale)` to `ChatbotSmsNumberLayer`. Add `replacePlaceholdersInReply($reply, $locale, $channel, $itemSelectionMode)` — replaces `__CART_FOOTER__` and `__EDIT_ACTION_OPTIONS__` with numbered text for SMS/Web only. Never processes Messenger. Update `ChatbotWebhookController` to call `replacePlaceholdersInReply` after FSM for SMS/Web channels.

**Files:** `ChatbotSmsNumberLayer.php`, `ChatbotWebhookController.php`

**Verify before moving on:** Full end-to-end trace for SMS/Web: cart reply arrives with `__CART_FOOTER__` → after layer → numbered footer appears. Messenger: no placeholder, no footer, unchanged.

**Dependency:** Tasks 3 and 4 must be done first.

---

## Task 6 — ensureChoiceStateOptionsInReplies: extend for cart_menu mode

**What:** Extend `ensureChoiceStateOptionsInReplies` to accept `item_selection_mode` in context. When `nextState === 'item_selection'` and mode is `cart_menu`, append formatted cart options. This handles the invalid input case.

**Files:** `ChatbotSmsNumberLayer.php`, `ChatbotWebhookController.php` (pass `item_selection_mode`)

**Verify before moving on:** Send invalid input in cart_menu state on SMS/Web → reply includes "Invalid option." followed by numbered cart options.

**Dependency:** Task 5.

---

## Task 7 — Invalid language: make number-free

**What:** Change `invalid_language` in all three lang files to `'Invalid choice.'`. Verify `ensureChoiceStateOptionsInReplies` appends formatted language options when `nextState === 'language_selection'` and reply does not already contain them.

**Files:** `lang/en/chatbot.php`, `lang/tl/chatbot.php`, `lang/ilo/chatbot.php`

**Verify before moving on:** Send invalid input at language selection on SMS/Web → reply is "Invalid choice." followed by "1. English\n2. Tagalog\n3. Ilocano".

**Dependency:** Task 3.

---

## Task 8 — ChatbotRepliesController: option label badges

**What:** Add `cart_option_*` and `edit_option_*` to `collectOptionLabelKeys()` so portal shows the "Option label" badge.

**Files:** `ChatbotRepliesController.php`

**Verify before moving on:** Open portal chatbot-replies page — cart and edit option keys show the badge.

**Dependency:** Task 3.

---

## Task 9 — Final verification

- SMS/Web full flow: order → cart → type `1` → layer maps to `add` → FSM adds item → cart reply shows numbered footer
- SMS/Web full flow: type `4` in cart → layer maps to `confirm` → FSM confirms order
- Messenger full flow: cart reply shows no footer, no placeholder, no numbers in bubble
- Invalid cart input on SMS/Web → "Invalid option." + numbered cart options
- Invalid language on SMS/Web → "Invalid choice." + numbered language options
- Portal: all new label keys visible with correct badges
- Run full test suite, zero regressions

---

## Rules for executing these tasks

1. **Do not start Task N+1 until Task N is verified**
2. **If any task requires the FSM to branch on a raw number that didn't come through the layer, stop and flag it before continuing**
3. **Messenger must never appear in any layer condition you add**
4. **Commit each task separately** so regressions are easy to isolate
