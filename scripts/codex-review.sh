#!/usr/bin/env bash
# Run a read-only Codex review using ChatGPT subscription auth only.
#
#   codex-review.sh <output-file> < prompt.txt
#
# The prompt is read from stdin. Codex's final message is written to <output-file>;
# the full progress log goes to <output-file>.log. Codex runs in a read-only sandbox
# from the current directory, so it can read the repo but not change it.
set -euo pipefail

out="${1:?usage: codex-review.sh <output-file> < prompt}"

# Never fall back to API billing: drop API-key variables for the codex process.
unset OPENAI_API_KEY CODEX_API_KEY || true

if ! codex login status 2>&1 | grep -q "Logged in using ChatGPT"; then
  echo "codex is not logged in with a ChatGPT subscription; run: codex login --device-auth" >&2
  exit 1
fi

if ! timeout "${CODEX_REVIEW_TIMEOUT:-600}" \
  codex exec --skip-git-repo-check --sandbox read-only -o "$out" - >"$out.log" 2>&1; then
  echo "codex exec failed; last lines of $out.log:" >&2
  tail -n 20 "$out.log" >&2
  exit 1
fi
echo "review written to $out"
