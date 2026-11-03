# Documentation index

Start with [Architecture](../ARCHITECTURE.md) for the current request flow, module map, rules and extension recipes. [Glossary](../GLOSSARY.md) names the current domain concepts; the [ADR index](adr/README.md) records accepted decisions and explicitly marks proposals and non-adoptions.

The following documents preserve the decisions and evidence from earlier work. They are history; use the current architecture map and code for present behavior.

| Document | Status |
|---|---|
| [Architecture roadmap](architecture-roadmap.md) | Implementation items 2–9 completed; making `verify` required in GitHub branch protection remains a user action ([steps](branch-protection.md)). |
| [Code review 2026-10-26](code-review-2026-10-26.md) | Findings with their fix status; open items are marked. |
| [Regression review 2026-11](regression-review-2026-11.md) | Review of PRs 44–58; Major findings fixed, Minor findings open. |
| [Slide deck roadmap](slide-deck-roadmap.md) | Reducer and hook migration completed. |
| [Image credit roadmap](image-credit-roadmap.md) | Shared credit and renderer migration completed. |
| [Route module roadmap](route-module-roadmap.md) | Route policy and migration phases 1–3 completed. |
| [Workspace layout roadmap](workspace-layout-roadmap.md) | Phases 1–6 completed. |
| [Slide fit roadmap](slide-fit-roadmap.md) | Phases A–C completed (PRs 31–33). |
| [Commons licenses roadmap](commons-licenses-roadmap.md) | Phases 1–2 completed. |
| [Multi-session roadmap](multi-session-roadmap.md) | Phase 1 (in-memory session decks) completed; persistence not built. |
| [Home screen roadmap](home-screen-roadmap.md) | Completed (PRs 35 and 36). |
| [Theme and style roadmap](theme-style-roadmap.md) | Phases 1–4c completed (PRs 37–42). |
| [NASA provider](nasa-provider.md) | Historical manual-picker design and constraints. |
| [NASA provider evaluation](nasa-provider-evaluation.md) | Historical bounded evaluation and follow-up. |
| [Commons provider](commons-provider.md) | Historical picker, URL and export evidence. |

Verification records: [theme Phase 1](theme-phase1-verification.md), [Phase 2](theme-phase2-verification.md), [Phase 3](theme-phase3-verification.md), [Phase 4a](theme-phase4a-verification.md), [Phase 4b](theme-phase4b-verification.md), [Phase 4c](theme-phase4c-verification.md), [export picture cover](export-picture-cover-verification.md), [export integrity](export-integrity-verification.md) with [formula evidence](export-integrity-formulas.md), and [input hardening](input-hardening-verification.md).

## Archived working notes

Implementation plans and design notes written while changes were in progress are kept in [archive](archive/README.md). They are historical, not instructions, and their checklists were never kept current. Do not add new plan files to the repository: keep working plans outside the repository or in the pull request description, and record lasting decisions as an ADR.
