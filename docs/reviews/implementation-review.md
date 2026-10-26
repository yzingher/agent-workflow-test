# Implementation review (Codex, via `codex exec`, read-only, ChatGPT auth)

Reviewed against `docs/plan.md` (v2). Two rounds.

## Round 1 — 4 findings

| # | Sev | Finding | Decision / fix |
|---|-----|---------|----------------|
| 1 | Med | `tests/serve.cjs`: prefix check let `/..%2fpublic-x/...` escape the static root | **Fixed** — `path.resolve` + require `root + path.sep` prefix (now 403) |
| 2 | Low | `tests/serve.cjs`: malformed `%ZZ` crashed the server | **Fixed** — decode in try/catch, 400 |
| 3 | Med | XSS test only asserted after reload, so an add-time `innerHTML` regression would pass | **Fixed** — asserts before and after reload. Verified by mutation: switching `textContent` to `innerHTML` makes the test fail |
| 4 | Low | Corrupt-data notice said "A backup was kept" even if the backup write failed | **Fixed** — notice reflects whether the backup succeeded |

## Round 2 — verifying fixes

| # | Sev | Finding | Decision / fix |
|---|-----|---------|----------------|
| 5 | P2 | `tests/serve.cjs`: `/%00` passed checks and crashed `fs.readFile` | **Fixed** — paths containing NUL return 400 |

Items 1, 2 and 5 are in the local test server only, not the deployed app.
After all fixes: `node tests/e2e.cjs` → 13/13 passed.
