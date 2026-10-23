# 0009 — Not adopted yet: ppt-master as an export engine

Date: 2026-10
Status: Not adopted

## Context

The current PPTX route uses `buildPresentationPptx` in `src/lib/services/pptx-generator.ts`, backed by `pptxgenjs`. ppt-master was considered as an alternative export engine.

## Decision

Do not introduce ppt-master now. Its Python agent workflow would need an agent runtime, a separate sandboxed service and explicit spend controls; those are beyond the current request/response export path.

## Consequences

PPTX generation stays in the existing Node route. This ADR does not claim ppt-master is installed or integrated.

## Alternatives considered

An immediate replacement was rejected. Revisit only with a bounded service design, sandbox and spend controls, measured quality gain on representative decks, and a migration/rollback plan. See `docs/architecture-roadmap.md` for the current export architecture.
