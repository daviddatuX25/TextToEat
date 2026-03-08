# Testing Chatbot and Replies Customization Locally

## Does the simulator still apply?

**Yes.** The Channel Simulator and Messenger/SMS integration are unchanged:

- **Same routes:** `/api/chatbot/init`, `/api/chatbot/webhook`, `/api/chatbot/outbound-messages`
- **Same flow:** Chat.jsx (at `/portal/simulate`) calls the same API; real Messenger and SMS use the same `ChatbotWebhookController` and FSM
- **Same behavior when no overrides:** The reply resolver returns the same strings as before (from `lang/*/chatbot.php`) when there are no rows in `chatbot_reply_overrides`. So with an empty overrides table, chatbot behavior is identical to prior to the replies-customization changes.

## Quick local test (no overrides)

1. **Start the app** (e.g. Sail):
   ```bash
   cd texttoeat-app
   ./vendor/bin/sail up -d
   ./vendor/bin/sail artisan migrate
   ```

2. **Log in as admin** and open **Channel Simulator:**
   - Go to `http://<your-app>/portal/simulate` (or `/login` first if needed).

3. **Test Web chat:**
   - Leave channel on **Web chat**. Send e.g. `hi` → `1` (language) → `1` (main menu → order). You should see the same prompts as before (e.g. welcome, language options, menu).

4. **Test Simulate SMS / Simulate Messenger:**
   - Switch to **Simulate SMS** or **Simulate Messenger**, leave or set an external ID, then send the same sequence (`hi`, `1`, `1`, …). Replies should match the web flow (same copy from lang files).

5. **Run automated tests:**
   ```bash
   ./vendor/bin/sail test tests/Feature/ChatbotWebhookTest.php
   ```
   All tests hit the same webhook and resolver; if they pass, the chatbot logic (and thus simulator/Messenger/SMS behavior) is unchanged when no overrides exist.

## Testing the replies customization page

1. **Open Chatbot replies** (admin): `http://<your-app>/portal/chatbot-replies`.

2. **Without overrides:** You should see all keys with their default text (from lang files). Changing locale (en/tl/ilo) should show the same keys with different defaults.

3. **With overrides:**
   - Pick a key (e.g. **Main menu prompt**), change the text, click **Save**. You should see a success message and the value stored.
   - In the simulator (web or SMS/messenger), go through the flow until you hit that prompt; you should see your custom text.
   - Click **Reset to default** for that key; the row is removed and the prompt should show the lang default again.

4. **Placeholder validation:** For a key that requires placeholders (e.g. **Order placed (with reference)**), save without `:reference`. You should get a validation error and the override should not be saved.

## Comparing with behavior before the changes

- **Code diff:** Use git to compare `ChatbotWebhookController`, `ChatbotFsm`, `MessengerReplyBuilder`, and `ConversationInboxController`/`OrderStatusNotificationService` with the last commit before replies customization. The only behavioral change is that reply text is now sourced from `ChatbotReplyResolver` instead of `__()`. With no overrides, the resolver returns `__('chatbot.' . $key, $replace, $locale)`, i.e. the same as before.
- **Messenger/SMS:** Real Messenger and SMS still use the same webhook and FSM; only the string source changed. No changes were made to webhook URLs, channel handling, or outbound sending.

## Summary

| What to test              | How |
|---------------------------|-----|
| Simulator (web/SMS/messenger) | Use `/portal/simulate`; run through language → main menu → order flow. |
| Same behavior as before   | Run `ChatbotWebhookTest`; confirm no overrides → same reply text as lang files. |
| Replies customization UI  | Use `/portal/chatbot-replies`; save override, check simulator; reset and check default. |
| Placeholder validation     | Save an override that omits a required placeholder; expect 422 and error message. |
