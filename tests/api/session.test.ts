import crypto from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/session/route';

const TEST_SECRET = 'test-shared-secret';

function base64UrlEncode(value: Buffer | string): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function signHandoff(overrides: Record<string, unknown> = {}): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode(
    JSON.stringify({
      sub: 'firebase-user-1',
      aud: 'presentation-maker',
      jti: `session-test-${crypto.randomUUID()}`,
      iat: now,
      exp: now + 120,
      email: 'teacher@example.com',
      name: 'Teacher User',
      ...overrides,
    })
  );
  const signature = base64UrlEncode(
    crypto.createHmac('sha256', TEST_SECRET).update(payload).digest()
  );
  return `${payload}.${signature}`;
}

function requestWithAccess(token: string): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/session?access=${encodeURIComponent(token)}`
  );
}

function extractSessionToken(response: Response): string {
  const setCookie = response.headers.get('set-cookie');
  const match = setCookie?.match(/presentation_maker_pro_session=([^;]+)/);
  expect(match?.[1]).toBeTruthy();
  return decodeURIComponent(match![1]);
}

function expectNoStoreHeaders(response: Response) {
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(response.headers.get('Pragma')).toBe('no-cache');
  expect(response.headers.get('Expires')).toBe('0');
}

describe('GET /api/session', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      APPSTORE_AUTH_ENABLED: 'true',
      APPSTORE_SHARED_SECRET: TEST_SECRET,
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('exchanges a valid handoff token for a safe session cookie', async () => {
    const token = signHandoff();
    const response = await GET(requestWithAccess(token));

    expect(response.status).toBe(200);
    expectNoStoreHeaders(response);
    expect(response.headers.get('set-cookie')).toContain(
      'presentation_maker_pro_session='
    );

    const body = await response.json();
    expect(body).toEqual({
      authenticated: true,
      activated: true,
      user: {
        sub: 'firebase-user-1',
        email: 'teacher@example.com',
        name: 'Teacher User',
      },
      expiresAt: expect.any(Number),
    });
    expect(JSON.stringify(body)).not.toContain(token);
    expect(JSON.stringify(body)).not.toContain(TEST_SECRET);
  });

  it('returns safe identity metadata for a valid existing session cookie', async () => {
    const exchangeResponse = await GET(requestWithAccess(signHandoff()));
    const sessionToken = extractSessionToken(exchangeResponse);

    const response = await GET(
      new NextRequest('http://localhost:3000/api/session', {
        headers: { cookie: `presentation_maker_pro_session=${sessionToken}` },
      })
    );

    expect(response.status).toBe(200);
    expectNoStoreHeaders(response);
    await expect(response.json()).resolves.toEqual({
      authenticated: true,
      user: {
        sub: 'firebase-user-1',
        email: 'teacher@example.com',
        name: 'Teacher User',
      },
      expiresAt: expect.any(Number),
    });
  });

  it('returns a local authenticated mode when auth is explicitly disabled outside production', async () => {
    process.env = {
      ...process.env,
      APPSTORE_AUTH_ENABLED: 'false',
      APPSTORE_SHARED_SECRET: '',
    };

    const response = await GET(new NextRequest('http://localhost:3000/api/session'));

    expect(response.status).toBe(200);
    expectNoStoreHeaders(response);
    await expect(response.json()).resolves.toEqual({
      authenticated: true,
      mode: 'disabled',
      user: { sub: 'dev-bypass' },
    });
  });

  it('rejects a missing access token and session cookie generically', async () => {
    const response = await GET(new NextRequest('http://localhost:3000/api/session'));

    expect(response.status).toBe(401);
    expectNoStoreHeaders(response);
    await expect(response.json()).resolves.toEqual({
      authenticated: false,
      error: 'Authentication required.',
    });
  });

  it.each([
    ['malformed', 'not-a-token'],
    ['expired', signHandoff({ exp: Math.floor(Date.now() / 1000) - 30 })],
    ['wrong audience', signHandoff({ aud: 'another-tool' })],
    [
      'overlong',
      signHandoff({ exp: Math.floor(Date.now() / 1000) + 1000 }),
    ],
    [
      'future issued',
      signHandoff({
        iat: Math.floor(Date.now() / 1000) + 30,
        exp: Math.floor(Date.now() / 1000) + 150,
      }),
    ],
  ])('rejects a %s access token and clears the session cookie', async (_label, token) => {
    const response = await GET(requestWithAccess(token));

    expect(response.status).toBe(401);
    expectNoStoreHeaders(response);
    expect(response.headers.get('set-cookie')).toContain(
      'presentation_maker_pro_session='
    );
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
    await expect(response.json()).resolves.toEqual({
      authenticated: false,
      error: 'Authentication required.',
    });
  });

  it('rejects a replayed handoff token without falling back to an existing session', async () => {
    const token = signHandoff();

    const firstResponse = await GET(requestWithAccess(token));
    expect(firstResponse.status).toBe(200);

    const replayResponse = await GET(requestWithAccess(token));
    expect(replayResponse.status).toBe(401);
    expect(replayResponse.headers.get('set-cookie')).toContain('Max-Age=0');
  });

  it('rejects an invalid session cookie and clears it', async () => {
    const response = await GET(
      new NextRequest('http://localhost:3000/api/session', {
        headers: { cookie: 'presentation_maker_pro_session=invalid' },
      })
    );

    expect(response.status).toBe(401);
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
    await expect(response.json()).resolves.toEqual({
      authenticated: false,
      error: 'Authentication required.',
    });
  });

  it('fails closed with a generic configuration response in production', async () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'production',
      APPSTORE_AUTH_ENABLED: 'false',
      APPSTORE_SHARED_SECRET: TEST_SECRET,
    };

    const response = await GET(new NextRequest('http://localhost:3000/api/session'));

    expect(response.status).toBe(500);
    expectNoStoreHeaders(response);
    await expect(response.json()).resolves.toEqual({
      authenticated: false,
      error: 'Authentication service unavailable.',
    });
  });
});
