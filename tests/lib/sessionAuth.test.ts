import crypto from 'node:crypto';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  buildClearSessionCookie,
  buildSessionCookie,
  consumeHandoffJti,
  createSessionToken,
  getAppStoreAuthConfig,
  requireSession,
  verifyHandoffToken,
  verifySessionToken,
  type AppStoreAuthConfig,
} from '@/lib/sessionAuth';

const TEST_SECRET = 'test-shared-secret';

const baseConfig: AppStoreAuthConfig = {
  enabled: true,
  sharedSecret: TEST_SECRET,
  audience: 'presentation-maker',
  allowedClockSkewSeconds: 20,
  maxTokenTtlSeconds: 900,
  sessionMaxAgeSeconds: 3600,
  cookieSameSite: 'lax',
  cookieSecure: false,
};

function base64UrlEncode(value: Buffer | string): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function signClaims(claims: Record<string, unknown>, secret = TEST_SECRET): string {
  const payload = base64UrlEncode(JSON.stringify(claims));
  const signature = base64UrlEncode(
    crypto.createHmac('sha256', secret).update(payload).digest()
  );
  return `${payload}.${signature}`;
}

function handoffClaims(overrides: Record<string, unknown> = {}) {
  return {
    sub: 'firebase-user-1',
    aud: 'presentation-maker',
    jti: `jti-${crypto.randomUUID()}`,
    iat: 1000,
    exp: 1120,
    email: 'teacher@example.com',
    name: 'Teacher User',
    ...overrides,
  };
}

describe('sessionAuth', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('verifies a valid App Store handoff token and preserves safe identity claims', () => {
    const token = signClaims(handoffClaims());

    expect(verifyHandoffToken(token, baseConfig, 1050)).toMatchObject({
      sub: 'firebase-user-1',
      aud: 'presentation-maker',
      email: 'teacher@example.com',
      name: 'Teacher User',
      iat: 1000,
      exp: 1120,
    });
  });

  it('rejects malformed, tampered, incomplete, and wrong-audience tokens', () => {
    const validToken = signClaims(handoffClaims());
    const [payload, signature] = validToken.split('.');

    expect(verifyHandoffToken('not-a-token', baseConfig, 1050)).toBeNull();
    expect(verifyHandoffToken('@@.@@', baseConfig, 1050)).toBeNull();
    expect(verifyHandoffToken(`${payload}.${signature.slice(0, -1)}x`, baseConfig, 1050)).toBeNull();
    expect(
      verifyHandoffToken(signClaims(handoffClaims({ sub: '' })), baseConfig, 1050)
    ).toBeNull();
    expect(
      verifyHandoffToken(signClaims(handoffClaims({ jti: '' })), baseConfig, 1050)
    ).toBeNull();
    expect(
      verifyHandoffToken(
        signClaims(handoffClaims({ aud: 'another-tool' })),
        baseConfig,
        1050
      )
    ).toBeNull();
  });

  it('rejects expired, future-issued, and overlong handoff tokens', () => {
    expect(
      verifyHandoffToken(signClaims(handoffClaims({ exp: 1020 })), baseConfig, 1041)
    ).toBeNull();
    expect(
      verifyHandoffToken(signClaims(handoffClaims({ iat: 1071 })), baseConfig, 1050)
    ).toBeNull();
    expect(
      verifyHandoffToken(
        signClaims(handoffClaims({ iat: 1000, exp: 2001 })),
        baseConfig,
        1050
      )
    ).toBeNull();
  });

  it('allows a handoff jti once and removes it after expiry', () => {
    const jti = `replay-${crypto.randomUUID()}`;

    expect(consumeHandoffJti(jti, 1100, 1050)).toBe(true);
    expect(consumeHandoffJti(jti, 1100, 1051)).toBe(false);
    expect(consumeHandoffJti(jti, 1100, 1101)).toBe(true);
  });

  it('creates and verifies a separate session token while rejecting a handoff token', () => {
    const token = createSessionToken(
      {
        sub: 'firebase-user-1',
        email: 'teacher@example.com',
        name: 'Teacher User',
      },
      baseConfig,
      1000
    );

    expect(verifySessionToken(token, baseConfig, 1001)).toMatchObject({
      sub: 'firebase-user-1',
      email: 'teacher@example.com',
      name: 'Teacher User',
      typ: 'session',
      exp: 4600,
    });
    expect(
      verifySessionToken(signClaims(handoffClaims()), baseConfig, 1050)
    ).toBeNull();
  });

  it('serializes and clears a secure configurable session cookie', () => {
    const cookieConfig: AppStoreAuthConfig = {
      ...baseConfig,
      cookieSameSite: 'none',
      cookieSecure: true,
      cookieDomain: 'example.com',
    };

    const cookie = buildSessionCookie('signed-session', cookieConfig);
    expect(cookie).toContain('presentation_maker_pro_session=signed-session');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=None');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('Domain=example.com');
    expect(cookie).toContain('Max-Age=3600');

    const clearCookie = buildClearSessionCookie(cookieConfig);
    expect(clearCookie).toContain('presentation_maker_pro_session=');
    expect(clearCookie).toContain('Max-Age=0');
  });

  it('uses the local bypass only when auth is disabled outside production', () => {
    process.env = { ...process.env, NODE_ENV: 'test' };
    process.env.APPSTORE_AUTH_ENABLED = 'false';
    process.env.APPSTORE_SHARED_SECRET = '';

    const result = requireSession(new NextRequest('http://localhost:3000/api/test'));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.claims.sub).toBe('dev-bypass');
    }
  });

  it('returns a generic unauthorized response when an enabled request has no cookie', async () => {
    process.env = { ...process.env, NODE_ENV: 'test' };
    process.env.APPSTORE_AUTH_ENABLED = 'true';
    process.env.APPSTORE_SHARED_SECRET = TEST_SECRET;

    const result = requireSession(new NextRequest('http://localhost:3000/api/test'));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
      await expect(result.response.json()).resolves.toEqual({
        error: 'Authentication required.',
      });
    }
  });

  it('accepts a valid session cookie in an enabled request', () => {
    process.env = { ...process.env, NODE_ENV: 'test' };
    process.env.APPSTORE_AUTH_ENABLED = 'true';
    process.env.APPSTORE_SHARED_SECRET = TEST_SECRET;

    const token = createSessionToken(
      { sub: 'firebase-user-1' },
      baseConfig,
      Math.floor(Date.now() / 1000)
    );
    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: { cookie: `presentation_maker_pro_session=${token}` },
    });

    const result = requireSession(request);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.claims.sub).toBe('firebase-user-1');
    }
  });

  it('rejects a production configuration that is not explicitly enabled', () => {
    expect(() =>
      getAppStoreAuthConfig({
        NODE_ENV: 'production',
        APPSTORE_AUTH_ENABLED: 'false',
        APPSTORE_SHARED_SECRET: TEST_SECRET,
      })
    ).toThrowError(/auth configuration/i);
  });
});
