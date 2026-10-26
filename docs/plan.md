# Plan — Web Checklist (trial scope)

Status: **v2 — revised after Codex plan critique round 1** (see `docs/reviews/plan-review.md`)

## Goal
A polished, mobile-friendly single-page web checklist, deployed to Vercel.
A user can add items, mark them complete, and delete them. Items persist in
`localStorage` so they survive a page refresh.

## Out of scope
Accounts, backend, sync across devices, Expo/native, sharing, multiple lists,
editing item text, reordering.

## Stack
- Plain HTML + CSS + vanilla JavaScript. No framework, no build step, no dependencies.
- Static files in `public/`. `vercel.json`: framework `null` (Other), no build command,
  `outputDirectory: "public"`.

## Features
1. A `<form>` with a labelled text input and an "Add" submit button (Enter also submits).
   Input is trimmed; empty input is ignored. Max length 200 characters.
   After adding, the input is cleared and keeps focus.
2. Each item: a native checkbox whose `<label>` is the item text, and a delete
   `<button type="button">` with an accessible name `Delete "<text>"`.
3. Completed items: checkbox checked + strikethrough. Text stays at ≥ 4.5:1 contrast
   (not color-only).
4. Counter "N of M done", in an `aria-live="polite"` region.
5. Empty-state message when there are no items.
6. Focus management: after toggling, focus stays on that checkbox; after deleting,
   focus moves to the next item's checkbox, else the previous one, else the input.
7. Footer note: "Saved in this browser only."

## Data
- `localStorage` key `checklist.v1`: JSON array of
  `{ id: string, text: string, done: boolean, createdAt: number }`.
- IDs from `crypto.randomUUID()` (fallback: time + random). All mutations target items by ID.
- One in-memory array is the source of truth; render, counter and save all derive from it.
- **Load validation:** if JSON is invalid or not an array, the raw value is copied to
  `checklist.v1.backup`, the app starts empty and shows a notice. Individual records with
  the wrong shape (missing/empty id or text, non-boolean done, duplicate id) are dropped.
- **Storage failures:** every storage access is wrapped in try/catch. If saving fails, the
  app keeps working in memory and shows a persistent "Changes aren't being saved in this
  browser" notice; it clears after the next successful save.

## Security
- Item text is only ever rendered with `textContent`; no `innerHTML` with user data.

## UI
- Viewport meta tag. Single centered column, max width 560px, fluid down to 320px.
- Long unbroken text wraps (`overflow-wrap: anywhere`); no horizontal page scroll.
- Touch targets ≥ 44×44px. Visible `:focus-visible` outline.
- System font stack, light theme, `prefers-color-scheme: dark` supported.

## Testing (`tests/e2e.cjs`, Playwright + Chromium, against a local static server)
Each case starts with cleared storage.
- Add an item → reload → present. Complete → reload → still checked. Delete → reload → gone.
  Counter and empty state are checked after each reload.
- Whitespace-only input is ignored; two items with identical text toggle/delete independently.
- Markup text (`<img src=x onerror=...>`) renders as literal text, before and after reload.
- Corrupt JSON and wrong-shape storage: app loads, shows notice, backup key written.
- `setItem` throwing: app keeps working and shows the "not saved" notice.
- Keyboard: Enter adds; focus moves as specified after toggle/delete.
- 320px viewport with a long unbroken item: no horizontal overflow.
- Screenshots: 390×844 (mobile emulation, touch) and 1280×800 desktop; inspected manually.

## Deployment
- Push the branch to GitHub; link the repo to Vercel via the Git integration.
- Smoke-test the deployed URL: page loads, CSS/JS assets return 200, add + reload persists.

## Decisions on Codex findings not adopted
- "Verify with the onscreen keyboard open": cannot be reproduced in headless Chromium; the
  layout uses no fixed-position elements that the keyboard could cover, which removes the risk.
