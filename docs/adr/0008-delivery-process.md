# 0008 — Delivery process

Date: 2026-10
Status: Accepted
PR: [#21](https://github.com/Mokie04/Presentation-Maker-101/pull/21) (decision record for work shipped in earlier PRs)

## Context

Architecture changes need review, repeatable checks and a chance to inspect user-visible behavior before merge.

## Decision

Work on one branch per change, open a PR, require the `verify` job in `.github/workflows/ci.yml` to pass, smoke-test the Vercel preview, and merge only after approval. Do not commit straight to `main`. The workflow runs typecheck, lint, `npm test` and a production build for PRs and pushes to `main`; an advisory audit job is non-blocking (ADR 0030).

Production supports Node 22 and 24. Keep CI and `.nvmrc` on 22, with the package
engine range `>=22.12 <25`. PDF parsing is unsupported on Node 25 and later because
pdf-parse bundles pdf.js 1.10.100; replacing it is a separate task before widening
the runtime range.

## Consequences

Local tests do not replace preview checks for upload, images or export. Repository CI defines the job; GitHub branch protection must separately make it required, which is still an owner action: follow [Require the verify check on main](../branch-protection.md). A separate `verify-node24` job runs typecheck, tests and the build on Node 24; `verify` keeps its exact name because it is the check branch protection requires. Actions are pinned to commit SHAs and Dependabot proposes weekly npm and action updates (`.github/dependabot.yml`).

## Alternatives considered

Direct changes to `main` and skipping preview checks were rejected. See `docs/architecture-roadmap.md` and `docs/slide-deck-roadmap.md`.
