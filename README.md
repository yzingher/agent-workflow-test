# Checklist

A small, mobile-friendly web checklist. Add, complete and delete items; they're saved in
`localStorage`, so they survive a refresh. Static HTML/CSS/JS in `public/`, deployed on Vercel.

**Live:** https://agent-workflow-test-alpha.vercel.app (Vercel production, deployed with the
Vercel CLI; the project is not Git-linked, so pushes don't redeploy automatically).

- Plan: [`docs/plan.md`](docs/plan.md)
- Codex reviews: [`docs/reviews/`](docs/reviews/)
- Screenshots: [`docs/screenshots/`](docs/screenshots/)

## Run locally

    node tests/serve.cjs 4173      # http://127.0.0.1:4173

## Test (Playwright + Chromium)

    node tests/e2e.cjs                              # local
    BASE_URL=https://<deployment> node tests/e2e.cjs  # deployed
    SCREENSHOTS=docs/screenshots node tests/e2e.cjs  # also capture screenshots

## Codex review

    scripts/codex-review.sh <output.md> < prompt.txt

Runs `codex exec` read-only using the ChatGPT login from `codex login --device-auth`.
