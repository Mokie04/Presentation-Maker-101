# Presentation Maker Pro SSO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Protect Presentation Maker Pro with the existing Sayuna App Store signed handoff flow and a server-side HttpOnly session without changing the App Store issuer or catalog.

**Architecture:** Add a server-only HMAC authentication module that verifies the App Store's compact `payload.signature` handoff token, consumes its `jti` once, and exchanges it for a separately signed session cookie. Put a shared session guard before parsing or provider work in every existing API route, and gate the client workspace on a same-origin `/api/session` bootstrap that scrubs the short-lived `access` query parameter after a successful exchange.

**Tech Stack:** Next.js 14 App Router, TypeScript, Node `crypto`, Zod environment validation, HttpOnly cookies, Vitest, Testing Library, and the existing provider/export services.

**Spec:** `docs/superpowers/specs/2026-10-02-presentation-maker-pro-sso-design.md`

## Global Constraints

- Scope is limited to `/Users/johnnavarro/Sayuna Projects/Presentation Maker 101`; do not modify the Sayuna App Store repository or its issuer implementation.
- Handoff tokens use `base64url(payload).base64url(HMAC-SHA256(payload, shared secret))` with `sub`, `aud`, `jti`, `iat`, and `exp`, plus optional string identity claims.
- The expected audience is `APPSTORE_AUDIENCE`, defaulting to `presentation-maker`, and must match exactly.
- Clock skew defaults to 20 seconds and is clamped to 0–120 seconds.
- Handoff token lifetime defaults to 900 seconds and is clamped to 30–3600 seconds.
- Session lifetime defaults to 3600 seconds and is clamped to 300–86400 seconds.
- Production is fail-closed: `APPSTORE_AUTH_ENABLED=true` and `APPSTORE_SHARED_SECRET` are required; a production bypass is never honored.
- Non-production may use the documented explicit `APPSTORE_AUTH_ENABLED=false` bypass; protected-route tests set this mode explicitly so existing behavior tests remain focused on their route contracts.
- The session cookie is named `presentation_maker_pro_session`, uses `Path=/`, `HttpOnly`, bounded `Max-Age`, production `Secure`, and the configured SameSite/domain behavior; the default remains host-only when no domain is configured.
- Protected API responses use stable generic authentication/configuration messages and never expose tokens, cookies, secrets, prompts, uploads, provider payloads, or raw provider exceptions.
- No new authentication provider, role enforcement, billing/entitlement logic, distributed replay store, or dependency is introduced.

## Review Focus

- Production with a missing secret or `APPSTORE_AUTH_ENABLED=false` must return a generic configuration failure instead of bypassing auth; pin in Task 1's environment tests and Task 2's route tests.
- Malformed, tampered, wrong-audience, expired, future-issued, and overlong tokens must fail before identity is returned; pin in Task 1's verifier tests.
- A valid `jti` may be exchanged once and must expire from the process-local replay cache; pin in Task 1 and Task 2 replay tests.
- Cookie flags must remain safe for production and configurable for existing deployments, including `SameSite=None` requiring `Secure` and an optional domain; pin in Task 1 cookie tests.
- A client URL containing `access` plus other query parameters or a hash must preserve the unrelated URL parts while removing only `access`, and protected workspace children must not render before bootstrap succeeds; pin in Task 4's session-gate tests.

---

### Task 1: Auth Configuration and Signed Token Core

**Files:**
- Create: `src/lib/sessionAuth.ts`
- Modify: `src/lib/env.ts`
- Modify: `vitest.config.mts`
- Create: `tests/setup.ts`
- Modify: `tests/lib/env.test.ts`
- Create: `tests/lib/sessionAuth.test.ts`

**Interfaces:**
- Consumes: `process.env`, `NextRequest`, `NextResponse`, and the App Store compact HMAC token contract.
- Produces:
  - `AppStoreAuthConfig` with `enabled`, `sharedSecret`, `audience`, `allowedClockSkewSeconds`, `maxTokenTtlSeconds`, `sessionMaxAgeSeconds`, `cookieSameSite`, `cookieSecure`, and optional `cookieDomain`.
  - `getAppStoreAuthConfig(rawEnv?: Record<string, string | undefined>): AppStoreAuthConfig`.
  - `HandoffClaims` and `SessionClaims` identity types with `sub`, `aud`, `iat`, `exp`, optional `email`, `name`, and `role`, plus required `jti` for handoffs and `typ: 'session'` for session cookies.
  - `verifyHandoffToken(token: string, config: AppStoreAuthConfig, nowSeconds?: number): HandoffClaims | null`.
  - `createSessionToken(identity: Pick<SessionClaims, 'sub' | 'email' | 'name' | 'role'>, config: AppStoreAuthConfig, nowSeconds?: number): string`.
  - `verifySessionToken(token: string, config: AppStoreAuthConfig, nowSeconds?: number): SessionClaims | null`.
  - `consumeHandoffJti(jti: string, expiresAt: number, nowSeconds?: number): boolean`.
  - `buildSessionCookie(token: string, config: AppStoreAuthConfig): string` and `buildClearSessionCookie(config: AppStoreAuthConfig): string`.
  - `requireSession(request: NextRequest): { ok: true; claims: SessionClaims } | { ok: false; response: NextResponse }`.

- [ ] **Step 1: Add failing environment and token-core tests**

  Extend `tests/lib/env.test.ts` to assert auth defaults, numeric clamping, cookie parsing, and production fail-closed configuration. Create `tests/lib/sessionAuth.test.ts` with a test-only signer for the exact App Store token format and assertions for:

  - a valid token with optional `email`/`name` claims;
  - malformed segment counts, invalid base64url/JSON, tampered signatures, empty `sub`/`jti`, and wrong audience;
  - expired, future-issued, and overlong tokens with the configured clock values;
  - one-time `jti` consumption and expiry cleanup;
  - session-token creation/verification and rejection of a handoff token presented as a session;
  - cookie serialization, clearing, production `Secure`, `SameSite=None` safety, and optional `Domain`.

- [ ] **Step 2: Run the focused tests to verify they fail**

  Run: `npx vitest run tests/lib/env.test.ts tests/lib/sessionAuth.test.ts`

  Expected: FAIL because the auth configuration and session-auth module do not exist yet.

- [ ] **Step 3: Implement the minimal auth configuration and token module**

  Extend `AppConfig` with the normalized auth settings while preserving the existing provider settings. In `sessionAuth.ts`, use Node `crypto.createHmac('sha256', secret)` over the encoded payload and `crypto.timingSafeEqual` after checking signature lengths. Validate the exact claim and time contract, keep the replay map process-local with lazy expiry sweeping, sign a separate `typ: 'session'` cookie token, and return generic 401/500 `NextResponse` objects from `requireSession` without logging untrusted values. Treat non-production `APPSTORE_AUTH_ENABLED=false` as the only bypass; require both the explicit production flag and the shared secret in production.

- [ ] **Step 4: Configure the test harness and run the focused tests**

  Add `tests/setup.ts` through `vitest.config.mts` so route contract tests run with auth disabled by default; auth-specific tests override the environment and restore it. Run `npx vitest run tests/lib/env.test.ts tests/lib/sessionAuth.test.ts` and expect PASS.

- [ ] **Step 5: Commit the auth core**

  ```bash
  git add src/lib/sessionAuth.ts src/lib/env.ts vitest.config.mts tests/setup.ts tests/lib/env.test.ts tests/lib/sessionAuth.test.ts
  git commit -m "feat(security): add App Store session auth core"
  ```

### Task 2: Session Exchange Route

**Files:**
- Create: `src/app/api/session/route.ts`
- Create: `tests/api/session.test.ts`

**Interfaces:**
- Consumes: `getAppStoreAuthConfig`, `verifyHandoffToken`, `verifySessionToken`, `consumeHandoffJti`, cookie builders, and `NextRequest`.
- Produces: `GET /api/session` that returns only safe authenticated identity metadata and sets or clears `presentation_maker_pro_session` according to the request's access token or existing cookie.

- [ ] **Step 1: Write failing route tests**

  Add tests for:

  - a valid `?access=` token returning 200, setting a session cookie, returning `authenticated: true`/`activated: true`, and omitting the raw token and shared secret from the body;
  - a follow-up request with the session cookie returning the safe identity without requiring `access`;
  - missing access and missing cookie returning a generic 401;
  - malformed, expired, wrong-audience, overlong, future-issued, and replayed access tokens returning 401 with a cleared cookie;
  - invalid session cookies returning 401 with a cleared cookie;
  - production configuration failure returning generic 500 without an auth bypass;
  - every response containing `Cache-Control: no-store`, `Pragma: no-cache`, and `Expires: 0`.

- [ ] **Step 2: Run the route tests to verify they fail**

  Run: `npx vitest run tests/api/session.test.ts`

  Expected: FAIL because `/api/session` does not exist.

- [ ] **Step 3: Implement `GET(request: NextRequest)`**

  Resolve the auth config without exposing configuration details. In non-production disabled mode, return the existing app's local dev identity without issuing a cookie. With `access`, verify the handoff, require the exact audience, consume its `jti` until the handoff expiry, mint a separately timed session token, and set the session cookie. Without `access`, verify only the session cookie. Clear invalid cookies, reject replayed handoffs, keep error bodies generic, and apply the no-store headers to both success and failure responses.

- [ ] **Step 4: Run the route tests to verify they pass**

  Run: `npx vitest run tests/api/session.test.ts`

  Expected: PASS.

- [ ] **Step 5: Commit the session route**

  ```bash
  git add src/app/api/session/route.ts tests/api/session.test.ts
  git commit -m "feat(security): exchange App Store handoffs for sessions"
  ```

### Task 3: Protect Existing API Routes Before Work Begins

**Files:**
- Modify: `src/app/api/generate/route.ts`
- Modify: `src/app/api/generate-image/route.ts`
- Modify: `src/app/api/generate-images/route.ts`
- Modify: `src/app/api/upload/route.ts`
- Modify: `src/app/api/download-pptx/route.ts`
- Modify: `src/app/api/download-markdown/route.ts`
- Modify: `src/app/api/health/route.ts`
- Create: `tests/api/auth-protection.test.ts`
- Modify: `tests/api/health.test.ts`

**Interfaces:**
- Consumes: `requireSession(request)` from `src/lib/sessionAuth.ts`.
- Produces: unchanged successful route response contracts for authenticated/disabled callers and a generic 401 for requests without a valid session.

- [ ] **Step 1: Add failing protection tests**

  Enable auth with a test secret, send requests without a session cookie to all seven routes, and assert 401 before downstream work. Spy on the text/image providers, document parser, image batch service, PPTX/Markdown builders, and health checker to prove none is called. Also assert an authenticated session cookie preserves one successful response contract for representative generation, upload, download, image, and health requests.

- [ ] **Step 2: Run the protection tests to verify they fail**

  Run: `npx vitest run tests/api/auth-protection.test.ts`

  Expected: FAIL because the existing handlers currently parse requests or call providers without checking a session.

- [ ] **Step 3: Add the guard as the first operation in each handler**

  Import `requireSession`, call it before `request.json()`, `request.formData()`, schema validation, provider invocation, parser invocation, export generation, or health checks, and immediately return `auth.response` when `ok` is false. Change the health handler to accept `NextRequest` so it can use the same guard; do not change any successful response body, status, or export headers.

- [ ] **Step 4: Run focused and existing API tests**

  Run: `npx vitest run tests/api/auth-protection.test.ts tests/api/generate.test.ts tests/api/generate-image.test.ts tests/api/generate-images.test.ts tests/api/upload.test.ts tests/api/download-pptx.test.ts tests/api/download-markdown.test.ts tests/api/health.test.ts`

  Expected: PASS, with existing route tests using the explicit non-production bypass from `tests/setup.ts`.

- [ ] **Step 5: Commit API protection**

  ```bash
  git add src/app/api/generate/route.ts src/app/api/generate-image/route.ts src/app/api/generate-images/route.ts src/app/api/upload/route.ts src/app/api/download-pptx/route.ts src/app/api/download-markdown/route.ts src/app/api/health/route.ts tests/api/auth-protection.test.ts tests/api/health.test.ts
  git commit -m "feat(security): protect presentation maker APIs"
  ```

### Task 4: Client Session Bootstrap and Workspace Gate

**Files:**
- Create: `src/components/SessionGate.tsx`
- Modify: `src/app/page.tsx`
- Create: `tests/components/SessionGate.test.tsx`

**Interfaces:**
- Consumes: same-origin `GET /api/session`, the browser's `access` query parameter, and the existing page workspace.
- Produces: `SessionGate({ children }: { children: React.ReactNode })`, which renders loading/access-required/error states until the session is authenticated and renders children only after success.

- [ ] **Step 1: Write failing component tests**

  Mock `fetch` and assert:

  - the loading state hides protected children while `/api/session` is pending;
  - a successful access exchange uses `credentials: 'include'`, sends the encoded token, renders children, and removes only `access` while preserving unrelated query parameters and the URL hash;
  - a successful cookie-only bootstrap works without an access parameter;
  - a 401 renders a generic access-required state and does not render children;
  - a non-401 failure renders a generic authentication-error state and does not expose the response body.

- [ ] **Step 2: Run the component tests to verify they fail**

  Run: `npx vitest run tests/components/SessionGate.test.tsx`

  Expected: FAIL because the session gate does not exist.

- [ ] **Step 3: Implement the focused session gate and wrap the page**

  Create a client component that performs one bootstrap request with `credentials: 'include'` and `cache: 'no-store'`. On a successful response, remove only `access` with `history.replaceState` and render the existing workspace. Keep the current presentation logic and API request bodies intact by moving it behind the gate rather than adding auth state throughout the editor. Use stable generic UI copy for loading, access-required, and unavailable states.

- [ ] **Step 4: Run the component tests and typecheck**

  Run: `npx vitest run tests/components/SessionGate.test.tsx && npx tsc --noEmit`

  Expected: PASS with no TypeScript errors.

- [ ] **Step 5: Commit the client gate**

  ```bash
  git add src/components/SessionGate.tsx src/app/page.tsx tests/components/SessionGate.test.tsx
  git commit -m "feat(security): gate presentation maker workspace"
  ```

### Task 5: Deployment Documentation and Whole-Branch Verification

**Files:**
- Modify: `.env.example`
- Modify: `README.md`

**Interfaces:**
- Consumes: the finalized auth configuration and route behavior from Tasks 1–4.
- Produces: reproducible local/deployment instructions without committing a shared secret, plus evidence for the full local verification gate.

- [ ] **Step 1: Document the required environment contract**

  Add the nine SSO variables to `.env.example` with no secret value: `APPSTORE_AUTH_ENABLED`, `APPSTORE_SHARED_SECRET`, `APPSTORE_AUDIENCE`, `APPSTORE_ALLOWED_CLOCK_SKEW_SECONDS`, `APPSTORE_MAX_TOKEN_TTL_SECONDS`, `APPSTORE_SESSION_MAX_AGE_SECONDS`, `APPSTORE_COOKIE_SAMESITE`, `APPSTORE_COOKIE_SECURE`, and `APPSTORE_COOKIE_DOMAIN`. Update the README with the explicit local bypass, required production settings, matching App Store audience/secret requirement, cookie defaults, and the separate authenticated production-smoke-test gate. Do not edit or stage `.env.local`.

- [ ] **Step 2: Verify documentation and repository hygiene**

  Run: `git diff --check` and inspect `git diff --stat` plus `git status --short`; expected output contains only the target repository's SSO files and no secret values.

- [ ] **Step 3: Run the complete local verification suite**

  Run: `npm test && npx tsc --noEmit && npm run lint && npm run build`.

  Expected: all existing and new tests pass, TypeScript passes, lint passes, and the Next.js production build completes. These checks do not prove authenticated Vercel/browser behavior; deployment environment configuration and authenticated smoke testing remain separate release gates.

- [ ] **Step 4: Commit documentation and verification-ready changes**

  ```bash
  git add .env.example README.md
  git commit -m "docs(security): document Presentation Maker Pro SSO"
  ```

- [ ] **Step 5: Final scope check before any push**

  Run: `git diff origin/main --name-only` and `git log --oneline --decorate -6`.

  Expected: only Presentation Maker 101 files are listed; no App Store repository path, provider secret, or unrelated dirty file is included. Pushing to `main`, configuring Vercel secrets, and authenticated production smoke testing remain explicit release actions after this review.
