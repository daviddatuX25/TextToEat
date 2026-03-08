---
name: Choice state always show options
overview: "Enforce a single rule for web/SMS: when the next state is a choice state, the reply must always include the formatted options (prompt + numbered list). Today options are only added when a segment contains the bare prompt; when the reply is \"Welcome! Choose your language.\" or \"Invalid choice. Reply 1, 2, or 3...\" no segment contains the prompt, so options are missing. Fix by ensuring options are appended when not already present."
todos: []
isProject: false
---

# Choice state: always show options (core rule)

## Problem

In the SMS simulator (and web when applicable):

1. **First message / welcome:** User sends e.g. "sdf"; FSM returns `nextState = language_selection`, reply = "Welcome! Choose your language." No segment contains the bare prompt `"Choose language:"`, so the current logic never replaces anything and the reply is sent without "1. English, 2. Tagalog, 3. Ilocano".
2. **Invalid language:** Reply is "Invalid choice. Reply 1, 2, or 3 for language." Again no segment contains the prompt, so options are not added.

Root cause: we only add options by **replacing** a segment that contains the prompt. When the FSM returns a different string (welcome, invalid_language, etc.) we never add the options.

SMS simulator also **skips init** ([Chat.jsx](texttoeat-app/resources/js/Pages/Chat.jsx) lines 75–77: "SMS conversations are user-initiated; skip init hook for sms"). So the first thing the user sees is the first webhook response (welcome or invalid), which today often has no options.

## Target rule

**For channel web/sms and nextState a choice state: the response must always include the formatted options.** Either we embed them by replacing a segment that contains the prompt, or we **append** the formatted choice as an extra segment when we did not replace. No special-casing per state or per message type.

---

## 1. Centralize the rule in ChatbotSmsNumberLayer

**File:** [app/Services/ChatbotSmsNumberLayer.php](texttoeat-app/app/Services/ChatbotSmsNumberLayer.php)

Add a method that implements the rule in one place:

- **Signature:** `ensureChoiceStateOptionsInReplies(array $replies, string $nextState, string $locale, array $context = []): array`  
Returns `['replies' => array, 'reply' => string]` (updated replies and full reply string).
- **Logic:**
  1. If `$nextState` is not a choice state (`!$this->isChoiceState($nextState)`), return `$replies` and `implode("\n\n", $replies)` unchanged.
  2. Get `formattedChoice` and `promptOnly` (same as today: `formatChoiceStateReply`, `getChoiceStatePromptOnly`; for `delivery_choice` use `$context['delivery_areas']`).
  3. **Replace:** For each segment, if it contains `$promptOnly`, replace that substring with `$formattedChoice` (current behavior). Track whether any replacement was made.
  4. **Append if missing:** If no replacement was made, or if the concatenated reply does not already contain the formatted options (e.g. no segment contains `"1. "` followed by the first option label), append `$formattedChoice` as a new element to `$replies`.
  5. Rebuild `$reply = implode("\n\n", $replies)` and return.

So: one place owns “if there are options, show them” (replace or append). Callers just pass replies and next state.

---

## 2. Webhook: use the layer instead of inline logic

**File:** [app/Http/Controllers/ChatbotWebhookController.php](texttoeat-app/app/Http/Controllers/ChatbotWebhookController.php)

- After building `$replies` and `$reply` from the FSM (and any existing special cases), when `channel` is `web` or `sms` and `$nextState` is set, call:
`[$replies, $reply] = $smsLayer->ensureChoiceStateOptionsInReplies($replies, $nextState, $locale, $context);`
with `$context = $nextState === 'delivery_choice' ? ['delivery_areas' => $deliveryAreas] : []`.
- Remove the current inline block that does the replace-only logic (lines ~235–264). The webhook no longer contains choice-state formatting logic; it delegates to the layer.

Result: welcome → language_selection, invalid language, invalid main menu, back, etc. all get options when they’re missing, without extra branches in the controller.

---

## 3. Optional: init for SMS in simulator

**File:** [resources/js/Pages/Chat.jsx](texttoeat-app/resources/js/Pages/Chat.jsx)

Today the SMS simulator skips the init request, so the first response is the first webhook reply. With the append rule above, that first reply (e.g. welcome or invalid) will now include the options, so behavior is fixed even without init.

**Optional improvement:** Call init for SMS as well (remove or relax the `if (channel === 'sms') { setLoading(false); return; }` early return) so that on switching to SMS the user immediately sees greeting + welcome + formatted language options without sending a message. This is a UX improvement, not required for the “always show options” rule.

---

## 4. Summary


| Area                         | Change                                                                                                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ChatbotSmsNumberLayer**    | Add `ensureChoiceStateOptionsInReplies()`: replace segment if it contains prompt; else append formatted choice so options are always present for choice states. |
| **ChatbotWebhookController** | Replace inline replace-only logic with a single call to `ensureChoiceStateOptionsInReplies()`; pass context for delivery_choice.                                |
| **Chat.jsx (optional)**      | Call init for SMS so first paint shows welcome + options.                                                                                                       |


No change to FSM, resolver, or TextbeeSmsWebhookController; the latter already does its own replace when sending SMS. Tests: extend or add a case that (1) sends a first message in SMS that lands in language_selection and (2) asserts the reply contains the numbered language options; and (3) invalid language reply contains the options.