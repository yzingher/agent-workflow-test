# Codex review prompts

All of these are piped into `scripts/codex-review.sh <out-file>` from the repo root.

## Plan review, round 1

Use `plan-review-prompt.txt` followed by the plan:

    { cat "$SKILL_DIR/templates/plan-review-prompt.txt"; cat docs/plan.md; } \
      | "$SKILL_DIR/scripts/codex-review.sh" "$SCRATCH/plan-review-r1.md"

## Plan review, round 2 (final)

    Round 2 plan review (final round). You previously critiqued this plan; it has been revised.
    The agreed scope is unchanged: <one-line scope>.
    Report ONLY remaining problems that would cause an acceptance criterion to fail or a real bug,
    ordered by severity, each with a specific fix. Don't repeat items already addressed, and don't suggest
    scope expansion or nice-to-haves. If nothing substantive remains, say "No blocking findings".
    Max 8 findings. Plan:
    <cat docs/plan.md>

## Implementation review, round 1

    Code review. Review the implementation in this repository against the agreed plan in docs/plan.md.
    Files: <list the source, config and test files>.
    You may read files and run read-only commands; do not modify anything.
    Report only substantive problems: bugs, unmet plan requirements or acceptance criteria,
    accessibility or security defects, broken deploy config, or tests that don't verify what they
    claim. For each: file:line, severity, a concrete failure scenario, and a specific fix. No scope
    expansion, no style nits. If none, say "No substantive findings". Max 10 findings.

## Implementation review, round 2 (final)

    Follow-up code review (final round). Your previous review reported: <numbered one-line list>.
    They have been fixed (or rejected: <reasons>). Read the current files, verify each fix is
    correct and complete, and check that the changes introduced no new bugs. Report only substantive
    remaining problems (file:line, severity, scenario, fix). If none, say "No substantive findings".
    Read-only; do not modify files.

## Notes from use

- Without the "agreed scope, don't expand" sentence, Codex recommends backends, sync and frameworks.
- Codex can't bind local ports in its read-only sandbox, so it can't run browser tests itself.
  Claude runs the tests and gives Codex the results if they're relevant.
- A run takes 30 seconds to about 5 minutes. The default timeout is 600 s (`CODEX_REVIEW_TIMEOUT`).
