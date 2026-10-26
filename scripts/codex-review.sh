#!/usr/bin/env bash
# Run a read-only Codex review. The review prompt is read from stdin;
# Codex's final message is written to the file given as $1.
# Uses whatever `codex login` configured (ChatGPT subscription); never reads keys.
set -euo pipefail

out="${1:?usage: codex-review.sh <output-file> < prompt}"

if ! codex login status 2>&1 | grep -q "Logged in using ChatGPT"; then
  echo "codex is not logged in with ChatGPT; run: codex login --device-auth" >&2
  exit 1
fi

timeout "${CODEX_REVIEW_TIMEOUT:-600}" \
  codex exec --skip-git-repo-check --sandbox read-only -o "$out" - >"$out.log" 2>&1
echo "review written to $out"
