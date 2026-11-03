# Presentation Maker Pro App Store SSO Security Design

**Status:** Approved in chat on 2026-10-02

## Goal

Protect the separate Presentation Maker Pro application at `/Users/johnnavarro/Sayuna Projects/Presentation Maker 101` with the same signed App Store handoff and server-side session pattern used by the existing secured Sayuna apps.

## Scope

This change applies only to the Presentation Maker Pro repository. It does not change the already-configured Presentation Maker Pro catalog URL or the App Store issuer in `Sayuna-AI-Apps`, and it does not modify provider, billing, entitlement, or role behavior.

## Existing Contract

The App Store's `/api/presentation-token` route creates a compact two-part token:

```text
base64url(payload).base64url(HMAC-SHA256(payload, shared secret))
```

The payload contains `sub`, `aud`, `jti`, `iat`, and `exp`, with optional `email` and `name`. The issuer uses the shared secret from `PRESENTATION_MAKER_SHARED_SECRET` or `APPSTORE_SHARED_SECRET`, defaults the audience to `presentation-maker`, and bounds the handoff lifetime to 30–300 seconds with a normal default of 120 seconds. The App Store opens the tool with `?access=<token>`.

Presentation Maker Pro currently exposes unauthenticated Next.js route handlers for generation, image generation, upload, downloads, and health checks. Those routes must not invoke providers, parse uploaded content, or build exports before session authorization succeeds.

## Chosen Architecture

Use a server-side HMAC verifier and an HttpOnly session cookie. Do not add a Firebase client/server dependency or pass the handoff token through every API request.

### Token verification

Create a server-only session-auth module that:

- Reads `APPSTORE_SHARED_SECRET` and defaults `APPSTORE_AUDIENCE` to `presentation-maker`.
- Accepts only the existing two-part compact token format.
- Verifies the HMAC signature with a constant-time comparison.
- Requires a non-empty `sub`, an exact `aud` match, a finite future `exp`, and a valid `iat` when present.
- Allows bounded clock skew through `APPSTORE_ALLOWED_CLOCK_SKEW_SECONDS`, defaulting to 20 seconds and clamping to 0–120 seconds.
- Rejects handoff tokens whose lifetime exceeds `APPSTORE_MAX_TOKEN_TTL_SECONDS`, defaulting to 900 seconds and clamping to 30–3600 seconds.
- Tracks a `jti` until token expiry in a process-local replay cache, matching the existing app pattern. The short issuer TTL remains the cross-instance replay-control boundary; a shared replay store is out of scope.

### Session exchange

Add `GET /api/session`:

1. When `?access=` is present, verify the handoff token, enforce the audience, reject a replayed `jti`, and exchange it for a session claim set.
2. Set a host-only, HttpOnly session cookie named `presentation_maker_pro_session` with `Path=/`, bounded `Max-Age`, `Secure` in production, and the existing configurable SameSite/domain behavior.
3. Return only safe identity metadata (`sub`, optional email/role, and expiry); never return the shared secret or raw token.
4. When no access token is present, validate the existing session cookie and return its safe identity metadata, or return 401 with a cleared invalid cookie.
5. Send `Cache-Control: no-store`, `Pragma: no-cache`, and `Expires: 0` on session responses.

Session lifetime uses `APPSTORE_SESSION_MAX_AGE_SECONDS`, defaulting to 3600 seconds and clamping to 300–86400 seconds. Access-token and session claims remain separate so a short handoff token cannot silently become a longer access token.

### Production and local behavior

- Production is fail-closed. `APPSTORE_AUTH_ENABLED=true` and `APPSTORE_SHARED_SECRET` are required; missing or invalid configuration produces a generic configuration failure rather than an authentication bypass.
- Local development may explicitly set `APPSTORE_AUTH_ENABLED=false` so the app remains usable without an App Store launch; this bypass is not honored when `NODE_ENV=production`.
- The `.env.example` and README document `APPSTORE_AUTH_ENABLED`, `APPSTORE_SHARED_SECRET`, `APPSTORE_AUDIENCE`, `APPSTORE_ALLOWED_CLOCK_SKEW_SECONDS`, `APPSTORE_MAX_TOKEN_TTL_SECONDS`, `APPSTORE_SESSION_MAX_AGE_SECONDS`, `APPSTORE_COOKIE_SAMESITE`, `APPSTORE_COOKIE_SECURE`, and `APPSTORE_COOKIE_DOMAIN` without adding or copying any secret values.

### API protection

Add a `requireSession` guard and call it before request parsing or provider work in every existing API route except `/api/session`:

- `/api/generate`
- `/api/generate-image`
- `/api/generate-images`
- `/api/upload`
- `/api/download-pptx`
- `/api/download-markdown`
- `/api/health`

Unauthenticated requests return a generic 401 JSON response. The guard accepts only the session cookie; the original `?access=` token is exchanged once and is not accepted as a substitute on every API call.

### Client bootstrap

The client page will bootstrap the session on first load by calling `/api/session` with `credentials: 'include'` and, when present, the URL's `access` value. After a successful exchange it will remove the query parameter with `history.replaceState`, preventing the short-lived token from remaining in browser history, copied URLs, or referrer data. The UI will show a loading state while checking the session and an access-required state for 401 responses; it will not render the generation workspace or invoke protected APIs before authorization succeeds.

## Error and Privacy Rules

- Do not log access tokens, session cookies, shared secrets, Authorization headers, prompts, uploaded documents, provider payloads, or raw provider exceptions.
- Authentication failures use stable generic client messages; detailed secret/configuration values remain server-only and content-free.
- Provider and parser error handling remains unchanged after authorization; this work does not broaden error disclosure.
- No cross-origin credentialed API access is added. The app uses same-origin browser requests and host-only cookies.

## Files Expected to Change

- Create `src/lib/sessionAuth.ts` for token verification, replay tracking, cookie construction, and request claims.
- Create `src/app/api/session/route.ts` for handoff exchange and session inspection.
- Modify the existing API route handlers to call the session guard before parsing or provider work.
- Modify `src/app/page.tsx` or a focused client session-gate component for bootstrap, URL scrubbing, and access-required UI.
- Modify `src/lib/env.ts`, `.env.example`, and `README.md` to define and document the listed App Store SSO environment variables.
- Add focused tests under `tests/lib` and `tests/api` for the auth contract and protected-route behavior.

## Verification and Acceptance Criteria

The implementation is acceptable when:

1. A valid App Store token creates a session cookie and the browser URL no longer contains `access`.
2. Missing, malformed, tampered, expired, future-issued, overlong, wrong-audience, and replayed handoff tokens are rejected.
3. Missing or expired sessions receive 401 from every protected route before provider/parser/export work occurs.
4. A valid session can use every existing generation, upload, image, download, and health route without changing their successful response contracts.
5. Production configuration cannot silently disable auth, while the documented local bypass remains available.
6. Auth unit/route tests pass, followed by the full existing Vitest suite, TypeScript typecheck, lint, and Next production build.

## Non-goals

- Changing the App Store catalog link or issuer implementation.
- Introducing Firebase Auth, OAuth, role-based authorization, billing checks, or device limits into Presentation Maker Pro.
- Adding a distributed replay store or deployment/provider configuration through source changes.
- Claiming authenticated production/browser success from local tests alone; deployment configuration and authenticated smoke testing remain separate release gates.
