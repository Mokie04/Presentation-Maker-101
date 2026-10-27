# 0007 — Image provider seam

Date: 2026-10
Status: Accepted

## Context

Automatic image generation can use an OpenAI-compatible service or Pexels; their request details and fallback differ.

## Decision

`ImageProvider` in `src/lib/providers/image/types.ts` exposes `generate(ImageRequest)`. `src/lib/providers/image/openai.ts` owns the AI request and retries, `src/lib/providers/image/pexels.ts` delegates to Pexels, and `resolveImageProviders` in `src/lib/providers/image/compose.ts` chooses `ai`, `pexels` or `auto` order. `src/lib/providers/image-provider.ts` remains the route-facing facade.

## Consequences

`auto` adds Pexels fallback only when a Pexels key exists. ADR 0030 supersedes the original fixed `1024x576` policy with configurable, model-aware sizes; another provider must not inherit an unsupported size by accident. `tests/lib/providers/image/contract.test.ts` and `tests/lib/providers/image/compose.test.ts` cover the seam.

## Alternatives considered

One function with source-specific branches was rejected. See `docs/architecture-roadmap.md` (item 7).
