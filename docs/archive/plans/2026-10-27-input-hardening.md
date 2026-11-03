# Input hardening implementation ledger

Spec: user attachment “input hardening and reliability fixes”; baseline main 9e458d8.
Branch: fix/input-hardening. No push or merge. One commit per section A–H.

- [x] A — reproduce oversized-array route failure in heap-capped child processes; patch zod and undici; add route resource regression.
- [x] B — bound DOCX declarations and actual native inflation; cap PDF pages and extracted text; enforce shared 250,000-character lesson default.
- [x] C — bound text attempts/deadline, classify retries, propagate cancellation and preserve truncation errors.
- [x] D — per-slide automatic images, concurrency 3, lifecycle cancellation, counts/status and model-aware image settings.
- [x] E — bounded trusted image downloads, legacy subject/filename bounds, cache/security headers and CSRF checks.
- [x] F — include config in typecheck, build CI, advisory audit job, Node floor and route-owned durations.
- [x] G — ADR, architecture/README/review bookkeeping and explicit remaining limitations.
- [x] H — final Node 22 gates, clean-environment production build/header checks, browser fixtures and report.

## Decisions and evidence

- Reuse clean checkout on requested branch; preserve export/PPTX implementation except explicit filename requirement.
- Independent B/C/D implementation under dispatching-parallel-agents; E starts only independent files until shared-route commits are ready.
- A baseline 4,199,792-byte route fixtures exhaust isolated 256MB child heaps; patched routes return sanitized 400 in ~134ms with ~98MB heap growth.
- B: native zlib byte counters are needed because JSZip/pako can inflate synchronously beyond a paused stream; reconstruct bounded STORE data for mammoth.
- PDF worker cancellation is deferred under the request's allowed fallback: current bundling does not supply a reliable worker asset. Page precheck, pdf-parse max and text caps mitigate but do not impose a hard CPU deadline.
- Failure picture status remains visible until recovery/deletion/reset; successful completion hides it, so failures remain actionable.
- Auth precedes content-type/CSRF checks; session GET handoff is unchanged.

- Commit A f796f0f, B eace0c5, C 01915e0, D 7437776, E 1061ee3, F bee27b0.
- Final review exposed parser disagreement over ZIP end records and phantom progress after skipping/re-enabling queued images. RED regressions now protect both. Final corrections are kept in H with the final verification record, preserving one commit per requested section and existing history.
- The review's claimed lost-title regression was rejected after checking main: the old browser batch also omitted titles. Preserve description-only requests and query behavior.
- SDK wraps transport errors as APIConnectionError; bare programming TypeError fails immediately instead of spending three paid attempts.

- G committed2fd4bce. FinalNode22 typecheck/lint/full177files1854tests/cleanenvbuild pass; curl provesnosniff/referrerpolicy +protectedAPIno-store. Final47-file existing-test inventory and all deviations recorded in verification doc.
