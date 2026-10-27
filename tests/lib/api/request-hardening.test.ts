import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { defineRoute } from '@/lib/api';
import * as sessionAuth from '@/lib/sessionAuth';

const handler = vi.fn(async () => NextResponse.json({ ok: true }));
const endpoint = (parse: 'json' | 'form' | 'none' = 'json') => defineRoute({
  name: 'hardening-test', failureMessage: 'Request failed.', noStore: true, parse, handler,
});
const request = (headers: HeadersInit = {}, method = 'POST') => new NextRequest('https://app.example/api/test', {
  method, headers, ...(method === 'GET' ? {} : { body: '{}' }),
});
afterEach(() => vi.restoreAllMocks());

describe('request boundary hardening', () => {
  it.each([undefined, 'text/plain', 'application/x-www-form-urlencoded', 'application/jsonp'])('rejects JSON mutation content type %s before reading', async (contentType) => {
    const req = request(contentType ? { 'Content-Type': contentType } : {});
    const body = vi.spyOn(req, 'body', 'get');
    const res = await endpoint()(req);
    expect(res.status).toBe(415);
    expect(await res.json()).toEqual({ error: 'Content-Type must be application/json.' });
    expect(body).not.toHaveBeenCalled();
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it.each(['application/json', 'application/json; charset=utf-8', 'Application/JSON'])('accepts %s for same-origin JSON', async (contentType) => {
    expect((await endpoint()(request({ 'Content-Type': contentType, 'Sec-Fetch-Site': 'same-origin' }))).status).toBe(200);
  });

  it.each(['json', 'form', 'none'] as const)('rejects cross-site %s mutations before reading', async (parse) => {
    const req = request({ 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'cross-site' });
    const body = vi.spyOn(req, 'body', 'get');
    const res = await endpoint(parse)(req);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Cross-site requests are not allowed.' });
    expect(body).not.toHaveBeenCalled();
  });

  it.each(['PUT', 'PATCH', 'DELETE'])('rejects cross-site %s mutations', async (method) => {
    expect((await endpoint('none')(request({ 'Sec-Fetch-Site': 'cross-site' }, method))).status).toBe(403);
  });

  it('preserves authentication before either new policy check', async () => {
    vi.spyOn(sessionAuth, 'requireSession').mockReturnValueOnce({
      ok: false, response: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }),
    });
    const res = await endpoint()(request({ 'Sec-Fetch-Site': 'cross-site' }));
    expect(res.status).toBe(401);
  });

  it('leaves GET requests alone', async () => {
    expect((await endpoint('none')(request({ 'Sec-Fetch-Site': 'cross-site' }, 'GET'))).status).toBe(200);
  });
});
