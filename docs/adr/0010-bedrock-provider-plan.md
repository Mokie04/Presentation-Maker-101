# 0010 — Planned: Amazon Bedrock image provider

Date: 2026-10
Status: Proposed

## Context

The image-provider seam in `src/lib/providers/image/` can support another adapter. No Bedrock adapter is present today.

## Decision

Plan for Nova Canvas first, an IAM role through Vercel OIDC, an AWS Budgets alarm, and an AI-generated label. Ship the provider disabled until credentials, cost controls, output handling and preview checks are ready.

## Consequences

Implementation would extend `ImageProvider` and `resolveImageProviders`, add a Bedrock-specific reader in `src/lib/env.ts`, and test the opt-in path. Exposing it as a client-selected source would also extend `src/lib/schemas/image-request.ts` and route source types. This is a plan, not an active provider.

## Alternatives considered

Enabling it by default or sharing the OpenAI adapter's fixed image-size request was rejected for this plan. See `docs/architecture-roadmap.md` (after item 7).
