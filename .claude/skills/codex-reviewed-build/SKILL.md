---
name: codex-reviewed-build
description: Turn a rough product idea into a deployed, verified web app with Codex as an independent reviewer. Researches comparable products, asks informed scoping questions, agrees acceptance criteria, has Codex (via `codex exec`, ChatGPT subscription auth) challenge the plan and review the implementation, builds and tests in a real browser, deploys to Vercel and verifies the live URL. Use when the user says "codex-reviewed-build", or asks to take an idea through plan → Codex review → build → deploy.
argument-hint: "<rough idea, in a sentence or two>"
---

# Codex-reviewed build

Take the user's rough idea (`$ARGUMENTS`) to a working, deployed app. Claude plans, builds and
decides; Codex is a second opinion, reached through `codex exec`. Work in the current repo on the
session's working branch. Never merge to the default branch.

## Hard rules

- **Subscriptions only.** Codex must report `Logged in using ChatGPT`. Never set or use
  `OPENAI_API_KEY`, `codex login --with-api-key`, or any API-billing fallback. If Codex isn't
  logged in, run `codex login --device-auth` in the background and give the user the URL and code.
- **Never print or commit credentials** (`~/.codex/`, Vercel CLI auth, `.env*`, tokens). Scan the
  staged diff before every commit.
- **Evaluate every review finding.** Accept it, partly accept it, or reject it with a reason
  tied to the agreed requirements. Never apply findings wholesale. Record each decision.
- **Scope changes are the user's call.** If a finding, or something you discover, means the agreed
  scope can't be met as written, stop and raise it explicitly with options. Don't silently grow or shrink scope.
- **At most two Codex rounds** per review stage. After round 2, anything still open goes to the
  user as a named blocker, not a third round.
- **Ask before external actions** that create or change shared things (new Vercel project, repo
  settings, paid resources, posting publicly) unless the user has already authorized that action.
  Read-only lookups need no permission.

## Phase 1 — Research and informed questions

1. Restate the idea in one line.
2. Research before asking. Look at 3–5 existing products or open-source projects doing the same
   thing (WebSearch/WebFetch), plus components or libraries that would save real work. Note what
   they do well, common pitfalls, and features users expect.
3. Ask the user **3–6 focused questions** with AskUserQuestion. Every question is grounded in that
   research and comes with a recommended default, e.g. "Most checklist apps persist locally first;
   do you need accounts/sync (adds a backend), or is this-browser-only fine? (Recommended: local only)".
   Cover target users and devices, must-have vs. nice-to-have features, data and persistence,
   auth, deployment target, and any constraints on stack or budget.
4. Write the research summary to `docs/research.md` (sources linked, one paragraph each).

## Phase 2 — Agree scope and acceptance criteria

Write `docs/plan.md` with:

- **Goal**, **In scope**, **Out of scope** (explicit).
- **Acceptance criteria**: observable, testable statements ("After adding an item and reloading,
  the item is still listed"), not intentions ("data is persisted well").
- Stack and the reason for it (prefer the simplest thing that meets the criteria).
- Data model, error and failure behavior, security notes, accessibility and mobile expectations.
- **Test plan**: which tests, at what level, and which screenshots (see Phase 5).
- Deployment plan.

Show the user the scope and acceptance criteria and get agreement before Phase 3. A short "yes"
is enough. If they already gave a precise scope, confirm it in one line and move on.

## Phase 3 — Codex challenges the plan

Run `scripts/codex-review.sh` from this skill (path below) with the plan-review prompt from
`templates/prompts.md`. The prompt must state the agreed scope and tell Codex not to propose
scope expansion. Without that, Codex pushes for backends and frameworks.

    SKILL_DIR=.claude/skills/codex-reviewed-build
    { cat "$SKILL_DIR/templates/plan-review-prompt.txt"; cat docs/plan.md; } \
      | "$SKILL_DIR/scripts/codex-review.sh" "$SCRATCH/plan-review-r1.md"

For each finding, decide accept / partly accept / reject (with a reason) and update the plan.
Run round 2 only if round 1 led to substantive changes. Round 2 asks only for blocking issues.
Record both rounds in `docs/reviews/plan-review.md` as a table: #, severity, finding, decision.

## Phase 4 — Build, Codex implementation review, fix

1. Build to the plan. Write the tests from the test plan alongside the code.
2. Run the tests and get them green.
3. Run the implementation-review prompt (`templates/prompts.md`). Codex reads the repo itself in
   a read-only sandbox, so point it at the plan and the file list rather than pasting code.
4. Evaluate each finding, fix the valid ones, rerun the affected tests. Round 2 verifies the
   fixes only. Record both rounds in `docs/reviews/implementation-review.md`.
5. Deliberately breaking code to prove a test catches a regression is **optional**. Do it only
   where it adds real confidence (e.g. a security test, or a test whose assertions might be
   vacuous), and always restore the code afterwards.

## Phase 5 — Verify, screenshot, deploy

**Tests.** Choose tests for the project, not a fixed list: core flows from the acceptance
criteria, persistence or data round-trips, failure paths the plan names, security-relevant
rendering, and responsive layout. Chromium and Playwright are pre-installed in cloud sessions
(`require('playwright')`; don't reinstall). `templates/e2e-template.cjs` is a runnable skeleton
that takes `BASE_URL` so the same suite runs locally and against the deployment.

**Screenshots.** Pick the views that matter for this project: typically mobile and desktop at the
main state, plus the empty, error and dark-mode states if the app has them. Open every screenshot with
Read and actually inspect it for clipping, overflow, overlap, unreadable contrast, broken layout
and missing assets. Save the screenshots to `docs/screenshots/`. Fix real visual problems; list cosmetic ones.

**Commit and push.** Stage the files, scan the staged diff for secrets, commit, then push the working
branch (`git push -u origin <branch>`).

**Deploy to Vercel**, in order of preference:
1. Vercel MCP: find the team (`list_teams`) and an existing project for the repo
   (`list_projects` with `repoUrl`). If one exists, pushes deploy automatically; find the
   deployment with `list_deployments` (filter by branch or SHA).
2. If no project exists, creating one is an external action: get permission, then use
   `create_git_project`.
3. If the MCP returns 403 for project creation (the connector's token may lack that permission), fall back to the
   Vercel CLI with the user's own account: run `npx -y vercel@53 login` in the background and give
   the user the device URL. Then `npx vercel@53 deploy --yes --scope <team-slug>` from the repo
   root (add `--prod` only if the user approved a production-labelled deploy). Never print the CLI's
   auth file. Add `.vercel/` to `.gitignore`.
4. If deployment protection blocks automated testing, use the MCP `get_access_to_vercel_url`
   share link, or ask the user to disable protection for this project.

**Verify the deployed app.** Rerun the browser suite with `BASE_URL=<deployed url>` and take at
least one screenshot of the live site. A deploy isn't done until this passes.

## Phase 6 — Report

Return, briefly:
- The working link, and whether it's a preview or production deployment.
- Test results (local and deployed): counts and any failures with their exact output.
- Screenshots, sent with SendUserFile.
- What Codex found, what was accepted or rejected, and why (one line each, or link the review docs).
- **Unresolved issues**: real ones only, each with its impact and a suggested next step.

## Files in this skill

- `scripts/codex-review.sh`: the review wrapper. Checks ChatGPT login, runs
  `codex exec --sandbox read-only`, and writes Codex's final answer to the given file, with the full
  log next to it. Copy it into the project's `scripts/` if the project should keep it.
- `templates/plan-review-prompt.txt`, `templates/prompts.md`: review prompts.
- `templates/e2e-template.cjs`: Playwright test skeleton with a static server, `BASE_URL`, and screenshots.
