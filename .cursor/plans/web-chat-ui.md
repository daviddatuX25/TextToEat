# Work Plan: Web-Based Chat UI for Chatbot Testing

## Overview

Add a **web-based chat UI** to the texttoeat-app so users can test the chatbot in the browser. The UI is integrated into the existing site (dedicated page at `/chat`), uses the same backend as SMS—the existing `POST /api/chatbot/webhook` and FSM in `ChatbotWebhookController`—and is web-only (no Twilio/SMS). Users see a message thread (user and bot messages in order), an input field, and a send button; sending a message yields a bot reply displayed in the thread. Session identity for the web channel is `channel=web` and `external_id` set to a stable per-browser value provided by the server (Laravel session ID) so that the same browser session reuses the same `ChatbotSession` and FSM state.

**Key constraints:**

- **Stack:** Laravel, Inertia, React, Vite, Tailwind, shadcn/ui (per `.cursor/rules`). Run npm via Sail.
- **Backend:** No change to the webhook contract; web calls the same endpoint with `channel=web` and a persistent `external_id`.
- **No Twilio/SMS** from the web UI; no removal or change to existing webhook behavior for SMS.
- **Session identification (web):** `channel=web`, `external_id` = value provided by server (e.g. Laravel `session()->getId()`) and passed to the frontend so every message from that browser uses the same session.

---

## Key Decisions

| Decision | Rationale |
|----------|------------|
| **Dedicated page `/chat`** | Single place to test the chatbot; fits existing pattern (e.g. `/menu`, `/track`). Can add a nav link in `AppLayout` for discoverability. |
| **Reuse `POST /api/chatbot/webhook`** | Same FSM and session logic; no new API contract. Frontend sends `channel`, `external_id`, `body`; receives `{ reply, state }`. |
| **`external_id` from server** | Use Laravel session ID (`session()->getId()`) for web so the same browser session maps to one `ChatbotSession`. Pass it to the Chat page via Inertia props (e.g. `webChatExternalId`) so the client sends it with every message. No guest UUID in cookie required. |
| **`channel=web`** | Distinguishes web test sessions from SMS in `chatbot_sessions.channel`; existing webhook and tests already support arbitrary channel values. |
| **API called with axios** | App already exposes `window.axios` in `resources/js/bootstrap.js`; use it for `POST /api/chatbot/webhook` (no Inertia form for chat send to avoid full-page semantics). |
| **UI components** | Use existing shadcn-style components from `resources/js/components/ui` (Button, Input, Card as needed); add only what’s missing (e.g. scrollable message list is custom markup + Tailwind). |

---

## Tasks

### Task 1: Add web route and controller (or closure) for Chat page with session ID

**Description:**  
Add a GET route for the chat page (e.g. `/chat`) that renders the Inertia Chat page and passes a stable `external_id` for the web channel. Use Laravel’s session ID so the same browser session reuses the same `ChatbotSession`. The route must run in the `web` middleware group so session is available.

**Files affected:**

- `texttoeat-app/routes/web.php` — Add `Route::get('/chat', ...)` that returns `Inertia::render('Chat', ['webChatExternalId' => session()->getId()])` (or use a dedicated `ChatController@index` if preferred for consistency with other pages).
- Optionally `texttoeat-app/app/Http/Controllers/ChatController.php` — If using a controller: method that returns `Inertia::render('Chat', ['webChatExternalId' => $request->session()->getId()])`.

**Dependencies:** None.

**Pattern reference:**  
`texttoeat-app/routes/web.php` (closure returning `Inertia::render('Welcome')` or `Track`).

**Acceptance criteria:**

```bash
# From project root
cd /home/sarmi/projects/texttoeat-v2/texttoeat-app && ./vendor/bin/sail test
# Expected: All tests pass (no regressions).

# Manual: Visit /chat (with app running). Page loads; no 404. (Chat page component can be a stub in Task 2.)
```

---

### Task 2: Create Inertia Chat page (React) with layout and props

**Description:**  
Create the Chat Inertia page component that uses `AppLayout`, receives `webChatExternalId` from props, and renders a simple chat shell: a message list area (initially empty or with a single “Send a message to start” hint), an input field, and a send button. Do not wire send to the API yet (Task 3); focus on structure and ensuring the page renders and the input/button exist.

**Files affected:**

- `texttoeat-app/resources/js/Pages/Chat.jsx` — New file. Default export a React component that uses `AppLayout`, reads `webChatExternalId` from `usePage().props`, and renders: (1) a scrollable message list container (e.g. flex column, overflow-auto, min-height), (2) an input (controlled) for the message, (3) a send button. Use existing UI components from `resources/js/components/ui` (e.g. `Button`, `Input`) and Tailwind. Optional: page title/heading “Chat” or “Test chatbot”.

**Dependencies:** Task 1 (route and prop exist).

**Pattern reference:**  
`texttoeat-app/resources/js/Pages/Welcome.jsx` (use of `AppLayout`), `texttoeat-app/resources/js/Pages/Menu.jsx` (use of `router`, state, UI components).

**Acceptance criteria:**

```bash
# Manual: Visit /chat. Page shows AppLayout (nav, etc.), a message area, an input, and a send button. No console errors.
```

---

### Task 3: Wire send message to webhook and display replies in thread

**Description:**  
Implement send flow: on submit (button click or Enter), (1) validate non-empty input; (2) append the user message to local state (e.g. `messages` array with `{ role: 'user', content: string }`); (3) call `POST /api/chatbot/webhook` with `channel: 'web'`, `external_id: webChatExternalId`, `body: message` using `window.axios`; (4) on success, append `{ role: 'bot', content: response.data.reply }` to `messages`; (5) clear the input. Show messages in order (user, then bot). Handle loading state (e.g. disable send / show “Sending…” while request in flight) and basic error handling (e.g. show error message or toast if request fails).

**Files affected:**

- `texttoeat-app/resources/js/Pages/Chat.jsx` — Add state for `messages` (array of `{ role, content }`), `input`, `sending` (boolean). On send: push user message, set sending true, axios.post to `/api/chatbot/webhook` with channel, external_id, body; on success push bot reply, clear input; on error show feedback; set sending false. Render `messages` in the message list (e.g. user messages right-aligned or distinct style, bot left-aligned). Ensure message list shows newest at bottom (optional: scroll to bottom after appending bot reply).

**Dependencies:** Task 2.

**Acceptance criteria:**

```bash
# Manual: Open /chat, type "hi", send. Bot reply appears in thread (e.g. language selection). Send "1" (or chosen language). Reply shows menu or next step. Messages appear in order; input clears after send.
# Optional: Run app and use browser devtools Network tab to confirm POST to /api/chatbot/webhook with body channel=web, external_id=<session-id>, body=<text>.
```

---

### Task 4: Optional UX improvements (scroll to bottom, loading state)

**Description:**  
If not already done in Task 3: (a) scroll the message list to the bottom when a new message (user or bot) is added; (b) show a clear loading state while the request is in progress (e.g. “Sending…” or spinner near the send button, or a temporary “bot is typing” entry). Keep implementation minimal.

**Files affected:**

- `texttoeat-app/resources/js/Pages/Chat.jsx` — Add ref for message list container and `useEffect` (or scroll after setState) to scroll to bottom when `messages` changes; ensure loading/sending state is visible.

**Dependencies:** Task 3.

**Acceptance criteria:**

```bash
# Manual: Send several messages. Message list scrolls so the latest message is in view. While waiting for reply, a loading indicator is visible.
```

---

### Task 5: Add Chat link to main navigation

**Description:**  
Add a “Chat” (or “Test chatbot”) link to the main nav in `AppLayout` so users can reach the chat page from any layout page. Match existing nav pattern (desktop and mobile).

**Files affected:**

- `texttoeat-app/resources/js/Layouts/AppLayout.jsx` — Add `NavLink` (or equivalent) for `/chat` next to Menu, Track (and Dashboard for staff). Include in both the desktop nav and the mobile menu panel.

**Dependencies:** Task 1 (route exists).

**Pattern reference:**  
`texttoeat-app/resources/js/Layouts/AppLayout.jsx` (existing `NavLink` for `/`, `/menu`, `/track`, `/dashboard`).

**Acceptance criteria:**

```bash
# Manual: From Home or Menu, click “Chat” in nav; navigate to /chat. In mobile view, open menu and confirm “Chat” is present and navigates to /chat.
```

---

### Task 6: Laravel test for web channel and session persistence

**Description:**  
Add or extend Laravel feature tests so that (1) the webhook accepts `channel=web` and a given `external_id` and returns 200 with `reply` and `state`; (2) two requests with the same `channel=web` and `external_id` share the same `ChatbotSession` and FSM state (e.g. first message gets welcome → language_selection; second message with same external_id and body "1" gets menu state). This verifies that the web UI will get consistent session behavior when using the same `webChatExternalId`.

**Files affected:**

- `texttoeat-app/tests/Feature/ChatbotWebhookTest.php` — Add test(s): e.g. `test_webhook_accepts_channel_web_and_returns_reply`, `test_web_channel_session_persists_across_requests` (same external_id, two POSTs, assert same session and state progression).

**Dependencies:** None (webhook already supports any channel).

**Pattern reference:**  
`texttoeat-app/tests/Feature/ChatbotWebhookTest.php` (existing `postJson('/api/chatbot/webhook', [...])`, `assertJsonStructure`, `assertDatabaseHas`, `ChatbotSession::where(...)`).

**Acceptance criteria:**

```bash
cd /home/sarmi/projects/texttoeat-v2/texttoeat-app && ./vendor/bin/sail test tests/Feature/ChatbotWebhookTest.php
# Expected: All tests pass, including new web-channel tests.
```

---

### Task 7: Manual verification checklist (for implementation agent or QA)

**Description:**  
Document a short manual verification checklist so an implementation agent or human can confirm end-to-end behavior. No code changes; add as a comment in the plan or a small `docs/` or `.cursor/plans/` note.

**Deliverable:**

- Checklist: (1) Visit `/chat` and see message list, input, send button. (2) Send "hi" → bot reply appears; send "1" (or language) → next reply. (3) Refresh page, send again with same session → conversation continues (same FSM state). (4) Open /chat in another browser or incognito → different session (different external_id), fresh welcome. (5) Nav link “Chat” works from desktop and mobile. (6) No Twilio/SMS calls from web UI.

**Acceptance criteria:**

```bash
# All checklist items above can be executed and pass when app is running (e.g. sail up, npm run dev or sail npm run dev).
```

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Session ID changes (e.g. session driver or config) | User could lose conversation context after refresh | Use `session()->getId()`; ensure session is persisted (file/database) and not regenerated on every request for the same browser. |
| API route not using web middleware (no session) | N/A for webhook; session is only needed for the GET /chat route that passes `webChatExternalId` | Keep /chat on `web.php`; webhook stays on `api.php` and receives `external_id` in body. |
| CORS or CSRF on API | Frontend POST might be blocked | Laravel API routes are typically stateless; if CSRF is required for same-origin, ensure axios sends credentials or use a route in web group; confirm no CORS issues when same origin. |
| Empty or missing `webChatExternalId` | Frontend might send null/undefined | Validate in frontend (disable send or show error if missing); optional: backend GET /chat could generate a fallback (e.g. `Str::uuid()->toString()`) and store in session if session ID unavailable. |

---

## Execution Notes

- **Order:** Task 1 → Task 2 → Task 3 can be done in sequence. Task 4 (optional UX) after Task 3. Task 5 can be done after Task 1 or in parallel with 2/3. Task 6 (Laravel tests) can be done in parallel with frontend work or after Task 3. Task 7 is documentation/checklist.
- **Parallelizable:** Task 5 and Task 6 can run in parallel with Task 2/3 once Task 1 is done.
- **Verification:** Run `./vendor/bin/sail test` after backend and test changes; run the manual checklist after all tasks.
- **No Twilio/SMS:** Do not add any Twilio or SMS sending from the web UI; do not change the existing webhook contract for SMS callers.

---

## Manual verification checklist

After implementation, verify:

1. Visit `/chat` and see message list, input, send button.
2. Send "hi" → bot reply appears; send "1" (or language) → next reply.
3. Refresh page, send again with same session → conversation continues (same FSM state).
4. Open /chat in another browser or incognito → different session (different external_id), fresh welcome.
5. Nav link "Chat" works from desktop and mobile.
6. No Twilio/SMS calls from web UI.
