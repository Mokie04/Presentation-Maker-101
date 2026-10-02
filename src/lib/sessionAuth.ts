import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

export type CookieSameSite = 'lax' | 'strict' | 'none';

export interface AppStoreAuthConfig {
  enabled: boolean;
  sharedSecret: string;
  audience: string;
  allowedClockSkewSeconds: number;
  maxTokenTtlSeconds: number;
  sessionMaxAgeSeconds: number;
  cookieSameSite: CookieSameSite;
  cookieSecure: boolean;
  cookieDomain?: string;
}

export interface HandoffClaims {
  sub: string;
  aud: string;
  jti: string;
  iat: number;
  exp: number;
  email?: string;
  name?: string;
  role?: string;
}

export interface SessionClaims {
  sub: string;
  aud: string;
  iat: number;
  exp: number;
  typ: 'session';
  email?: string;
  name?: string;
  role?: string;
}

export const SESSION_COOKIE_NAME = 'presentation_maker_pro_session';

type RawClaims = Record<string, unknown>;

const replayedHandoffJtis = new Map<string, number>();

function parseInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampInteger(value: string | undefined, fallback: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, parseInteger(value, fallback)));
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

export function getAppStoreAuthConfig(
  rawEnv: Record<string, string | undefined> = process.env
): AppStoreAuthConfig {
  const isProduction = rawEnv.NODE_ENV === 'production';
  const explicitlyEnabled = rawEnv.APPSTORE_AUTH_ENABLED === 'true';

  if (isProduction && rawEnv.APPSTORE_AUTH_ENABLED !== 'true') {
    throw new Error('App Store auth configuration is invalid.');
  }

  const enabled = isProduction || explicitlyEnabled;
  const sharedSecret = rawEnv.APPSTORE_SHARED_SECRET?.trim() || '';
  if (enabled && !sharedSecret) {
    throw new Error('App Store auth configuration is invalid.');
  }

  const audience = rawEnv.APPSTORE_AUDIENCE?.trim() || 'presentation-maker';
  const configuredSameSite = rawEnv.APPSTORE_COOKIE_SAMESITE?.trim().toLowerCase();
  const cookieSameSite: CookieSameSite =
    configuredSameSite === 'strict' ||
    configuredSameSite === 'lax' ||
    configuredSameSite === 'none'
      ? configuredSameSite
      : isProduction
        ? 'none'
        : 'lax';
  const configuredSecure = parseBoolean(rawEnv.APPSTORE_COOKIE_SECURE);
  const cookieSecure = isProduction || cookieSameSite === 'none' || configuredSecure === true;
  const cookieDomain = rawEnv.APPSTORE_COOKIE_DOMAIN?.trim() || undefined;

  return {
    enabled,
    sharedSecret,
    audience,
    allowedClockSkewSeconds: clampInteger(
      rawEnv.APPSTORE_ALLOWED_CLOCK_SKEW_SECONDS,
      20,
      0,
      120
    ),
    maxTokenTtlSeconds: clampInteger(
      rawEnv.APPSTORE_MAX_TOKEN_TTL_SECONDS,
      900,
      30,
      3600
    ),
    sessionMaxAgeSeconds: clampInteger(
      rawEnv.APPSTORE_SESSION_MAX_AGE_SECONDS,
      3600,
      300,
      86400
    ),
    cookieSameSite,
    cookieSecure,
    cookieDomain,
  };
}

function base64UrlEncode(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(input: string): Buffer | null {
  if (!/^[A-Za-z0-9_-]+$/.test(input)) return null;

  try {
    const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    return Buffer.from(padded, 'base64');
  } catch {
    return null;
  }
}

function signPayload(payloadB64: string, secret: string): string {
  return base64UrlEncode(crypto.createHmac('sha256', secret).update(payloadB64).digest());
}

function safeEqualString(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function decodeSignedClaims(token: string, secret: string): RawClaims | null {
  if (!token || !secret) return null;

  const parts = token.trim().split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

  const [payloadB64, signatureB64] = parts;
  const expectedSignature = signPayload(payloadB64, secret);
  if (!safeEqualString(signatureB64, expectedSignature)) return null;

  const payloadBuffer = base64UrlDecode(payloadB64);
  if (!payloadBuffer) return null;

  try {
    const payload = JSON.parse(payloadBuffer.toString('utf8')) as unknown;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
    return payload as RawClaims;
  } catch {
    return null;
  }
}

function readOptionalString(payload: RawClaims, key: 'email' | 'name' | 'role'): string | undefined {
  const value = payload[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidTimeWindow(
  payload: RawClaims,
  config: AppStoreAuthConfig,
  nowSeconds: number,
  maxLifetimeSeconds: number
): payload is RawClaims & { sub: string; aud: string; iat: number; exp: number } {
  if (typeof payload.sub !== 'string' || payload.sub.trim().length === 0) return false;
  if (payload.aud !== config.audience) return false;
  if (!isFiniteNumber(payload.iat) || !isFiniteNumber(payload.exp)) return false;

  const skew = config.allowedClockSkewSeconds;
  if (payload.exp + skew <= nowSeconds) return false;
  if (payload.iat > nowSeconds + skew) return false;
  if (payload.exp + skew < payload.iat) return false;
  if (payload.exp - payload.iat > maxLifetimeSeconds + skew) return false;

  return true;
}

export function verifyHandoffToken(
  token: string,
  config: AppStoreAuthConfig,
  nowSeconds = Math.floor(Date.now() / 1000)
): HandoffClaims | null {
  const payload = decodeSignedClaims(token, config.sharedSecret);
  if (!payload || payload.typ === 'session') return null;
  if (typeof payload.jti !== 'string' || payload.jti.trim().length === 0) return null;
  if (!isValidTimeWindow(payload, config, nowSeconds, config.maxTokenTtlSeconds)) return null;

  return {
    sub: payload.sub,
    aud: payload.aud,
    jti: payload.jti,
    iat: payload.iat,
    exp: payload.exp,
    email: readOptionalString(payload, 'email'),
    name: readOptionalString(payload, 'name'),
    role: readOptionalString(payload, 'role'),
  };
}

export function createSessionToken(
  identity: Pick<SessionClaims, 'sub' | 'email' | 'name' | 'role'>,
  config: AppStoreAuthConfig,
  nowSeconds = Math.floor(Date.now() / 1000)
): string {
  if (!config.sharedSecret) throw new Error('App Store auth configuration is invalid.');

  const payload = {
    sub: identity.sub,
    aud: config.audience,
    iat: nowSeconds,
    exp: nowSeconds + config.sessionMaxAgeSeconds,
    typ: 'session' as const,
    ...(identity.email ? { email: identity.email } : {}),
    ...(identity.name ? { name: identity.name } : {}),
    ...(identity.role ? { role: identity.role } : {}),
  };
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  return `${payloadB64}.${signPayload(payloadB64, config.sharedSecret)}`;
}

export function verifySessionToken(
  token: string,
  config: AppStoreAuthConfig,
  nowSeconds = Math.floor(Date.now() / 1000)
): SessionClaims | null {
  const payload = decodeSignedClaims(token, config.sharedSecret);
  if (!payload || payload.typ !== 'session') return null;
  if (!isValidTimeWindow(payload, config, nowSeconds, config.sessionMaxAgeSeconds)) return null;

  return {
    sub: payload.sub,
    aud: payload.aud,
    iat: payload.iat,
    exp: payload.exp,
    typ: 'session',
    email: readOptionalString(payload, 'email'),
    name: readOptionalString(payload, 'name'),
    role: readOptionalString(payload, 'role'),
  };
}

function sweepReplayedHandoffJtis(nowSeconds: number): void {
  replayedHandoffJtis.forEach((expiresAt, jti) => {
    if (expiresAt <= nowSeconds) replayedHandoffJtis.delete(jti);
  });
}

export function consumeHandoffJti(
  jti: string,
  expiresAt: number,
  nowSeconds = Math.floor(Date.now() / 1000)
): boolean {
  sweepReplayedHandoffJtis(nowSeconds);
  if (replayedHandoffJtis.has(jti)) return false;
  replayedHandoffJtis.set(jti, Math.max(nowSeconds + 1, expiresAt));
  if (replayedHandoffJtis.size > 1000) sweepReplayedHandoffJtis(nowSeconds);
  return true;
}

function sameSiteValue(value: CookieSameSite): string {
  return value === 'strict' ? 'Strict' : value === 'none' ? 'None' : 'Lax';
}

function cookieAttributes(config: AppStoreAuthConfig, maxAge: number): string {
  const secure = config.cookieSecure || config.cookieSameSite === 'none' ? '; Secure' : '';
  const domain = config.cookieDomain ? `; Domain=${config.cookieDomain}` : '';
  return `Path=/; HttpOnly; SameSite=${sameSiteValue(config.cookieSameSite)}; Max-Age=${Math.max(
    0,
    Math.floor(maxAge)
  )}${secure}${domain}`;
}

export function buildSessionCookie(token: string, config: AppStoreAuthConfig): string {
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; ${cookieAttributes(
    config,
    config.sessionMaxAgeSeconds
  )}`;
}

export function buildClearSessionCookie(config: AppStoreAuthConfig): string {
  return `${SESSION_COOKIE_NAME}=; ${cookieAttributes(config, 0)}`;
}

function authResponse(body: Record<string, string>, status: number): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export function requireSession(
  request: NextRequest
): { ok: true; claims: SessionClaims } | { ok: false; response: NextResponse } {
  let config: AppStoreAuthConfig;
  try {
    config = getAppStoreAuthConfig();
  } catch {
    return {
      ok: false,
      response: authResponse({ error: 'Authentication service unavailable.' }, 500),
    };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (!config.enabled) {
    return {
      ok: true,
      claims: {
        sub: 'dev-bypass',
        aud: config.audience,
        iat: nowSeconds,
        exp: nowSeconds + config.sessionMaxAgeSeconds,
        typ: 'session',
      },
    };
  }

  const cookieToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const claims = cookieToken ? verifySessionToken(cookieToken, config, nowSeconds) : null;
  if (!claims) {
    return {
      ok: false,
      response: authResponse({ error: 'Authentication required.' }, 401),
    };
  }

  return { ok: true, claims };
}
