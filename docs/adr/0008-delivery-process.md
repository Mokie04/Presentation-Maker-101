# 0008 — Delivery process

Date: 2026-10
Status: Accepted

## Context

Architecture changes need review, repeatable checks and a chance to inspect user-visible behavior before merge.

## Decision

Work on one branch per change, open a PR, require the `verify` job in `.github/workflows/ci.yml` to pass, smoke-test the Vercel preview, and merge only after approval. Do not commit straight to `main`. The workflow runs typecheck, lint and `npm test` for PRs and pushes to `main`.

## Consequences

Local tests do not replace preview checks for upload, images or export. Repository CI defines the job; GitHub branch protection must separately make it required. `docs/architecture-roadmap.md` still records that setting as a user action.

## Alternatives considered

Direct changes to `main` and skipping preview checks were rejected. See `docs/architecture-roadmap.md` and `docs/slide-deck-roadmap.md`.
