# Plan review (Codex, via `codex exec`, read-only, ChatGPT auth)

Two rounds, run with `scripts/codex-review.sh`.

## Round 1 — 12 findings on plan v1

| # | Sev | Finding | Decision |
|---|-----|---------|----------|
| 1 | High | Storage access/save failures undefined | **Accepted** — try/catch everywhere, in-memory fallback, persistent "not saved" notice |
| 2 | High | Loaded data not validated | **Accepted** — validate shape, drop bad records, back up unreadable JSON to `checklist.v1.backup` |
| 3 | High | Safe rendering unspecified (XSS) | **Accepted** — `textContent` only; markup-text test before/after reload |
| 4 | Med | Accessible names/keyboard unspecified | **Accepted** — labelled input, label-wrapped checkboxes, `Delete "<text>"` names, `type="button"`, focus ring |
| 5 | Med | Re-render may lose focus | **Accepted** — explicit focus rules after add/toggle/delete; `aria-live` counter |
| 6 | Med | Mobile criteria incomplete | **Accepted**: viewport meta, wrapping, 44px targets, no overflow at 320px. **Rejected**: "verify with onscreen keyboard open" — not reproducible headless; the layout has no fixed elements for a keyboard to cover |
| 7 | Med | "Muted" completed style may be unreadable | **Accepted** — strikethrough + checkbox state, ≥4.5:1 contrast |
| 8 | Med | Item identity / state drift | **Accepted** — `crypto.randomUUID`, mutate by ID, single source of truth |
| 9 | Med | One persistence sequence can hide bugs | **Accepted** — reload after each mutation, storage cleared per test |
| 10 | Med | Failure/usability paths untested | **Accepted** — tests for corrupt/wrong-shape storage, `setItem` throwing, whitespace, duplicates, markup, keyboard, 320px long text; mobile emulation |
| 11 | Low | Vercel config needs explicit checks | **Accepted** — `vercel.json` (Other, no build, `public/`), deployed smoke test |
| 12 | Low | Storage is per-origin | **Accepted** — footer "Saved in this browser only"; persistence tested on one origin |

No finding pushed for scope expansion (the prompt told Codex the scope was fixed).

## Round 2 — plan v2

Codex result: **"No blocking findings"**. Plan v2 is the agreed plan.
