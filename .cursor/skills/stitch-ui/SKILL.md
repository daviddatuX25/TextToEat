---
name: stitch-ui
description: Uses Google Stitch MCP to generate or refine UI designs during feature development. Use when starting a new screen/page, prototyping a UI, or when the user asks to design an interface with Stitch. Generates designs from prompts then implement in React + shadcn per project stack.
---

# Stitch UI — Design During Feature Development

Use the **Stitch MCP** (Google Stitch) to generate UI concepts and extract design context, then implement the actual UI in this codebase with **React, Inertia, Tailwind, and shadcn/ui**.

## When to Use This Skill

- Starting a **new UI feature** or screen (e.g. new dashboard tab, form, list, settings).
- User asks to **design**, **prototype**, or **mock up** an interface.
- You need a **layout or component reference** before coding (avoids blank-canvas).
- Keeping **visual consistency** across screens (extract design context from existing Stitch screen, then generate new one).

## Stitch MCP Tools (use via MCP)

| Tool | Use |
|------|-----|
| `list_projects` | See existing Stitch projects. |
| `create_project` | Create a new project for this app/feature. |
| `list_screens` | List screens in a project. |
| `generate_screen_from_text` | Generate a **new** screen from a text prompt. |
| `extract_design_context` | Get "Design DNA" (fonts, colors, layout) from an existing screen — use **before** generating a new screen for consistency. |
| `fetch_screen_code` | Download HTML/front-end code of a screen (reference only). |
| `fetch_screen_image` | Download high-res screenshot of a screen. |
| `get_screen` / `get_project` | Get metadata for a screen or project. |

## Designer Flow (Consistent UI)

1. **Extract** design context from an existing Stitch screen (e.g. dashboard or home).
2. **Generate** the new screen with a prompt that references that context so styles stay consistent.

Example: *"Get design context from the Dashboard screen"* → then *"Using that context, generate a Today's Menu list screen with table, add button, and row actions."*

## Prompt Shape (Zoom-Out → Zoom-In)

Structure prompts so Stitch has clear context, then screen-level detail:

- **Context:** One sentence — product/app and this feature (e.g. staff dashboard for today’s menu).
- **User:** Who uses this screen and when.
- **Goal:** What the user should see or do on this screen.
- **Screen type:** Web dashboard, form, list, mobile, etc.
- **Layout & hierarchy:** Header, main area, secondary blocks, order of importance.
- **Components:** Navbar, table, cards, primary button, badges, etc.
- **Visual:** Minimal, calm, dark/light, accent color.
- **Constraints:** Accessibility (e.g. WCAG), density, one-hand use if mobile.

## After Stitch: Implement Here

- **Do not** paste Stitch’s raw HTML into the app. Stitch output is **reference only**.
- Implement the screen in **React** using existing **shadcn/ui** components (`Button`, `Card`, `Table`, `Dialog`, `Badge`, etc.) in `resources/js/components/ui/`.
- Follow existing patterns in `resources/js/Pages/` (e.g. `Dashboard.jsx`: tabs, `useForm`, Inertia `router`).
- Use **Tailwind** for layout and spacing; match Stitch’s hierarchy and structure, not its markup.

## One-Line Reminder

Use Stitch to **get from idea to layout quickly**; then **build the real UI in React + shadcn** in this repo.
