import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { defineRoute, PublicError } from '@/lib/api';
import * as sessionAuth from '@/lib/sessionAuth';

function post(body: string) {
  return new NextRequest('http://localhost/api/test', {
    method: 'POST', body, headers: { 'Content-Type': 'application/json' },
  });
}

function route(handler: Parameters<typeof defineRoute>[0]['handler'], extra?: Partial<Parameters<typeof defineRoute>[0]>) {
  return defineRoute({ name: 'test-route', failureMessage: 'Something failed. Please try again.', handler, ...extra });
}

afterEach(() => { vi.restoreAllMocks(); });

describe('defineRoute', () => {
  it('returns the auth failure before reading the body or calling the handler', async () => {
    const denied = NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    vi.spyOn(sessionAuth, 'requireSession').mockReturnValueOnce({ ok: false, response: denied });
    const handler = vi.fn();
    const request = post('{"text":"lesson"}');
    const json = vi.spyOn(request, 'json');

    const res = await route(handler)(request);

    expect(res).toBe(denied);
    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
    expect(json).not.toHaveBeenCalled();
  });

  it('rejects invalid JSON with the existing 400 message', async () => {
    const handler = vi.fn();
    const res = await route(handler)(post('{not json'));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid JSON request body.' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('passes the parsed body, request and session claims to the handler', async () => {
    const handler = vi.fn(async () => NextResponse.json({ ok: true }));
    const request = post('{"text":"lesson"}');
    await route(handler)(request);
    expect(handler).toHaveBeenCalledWith({
      body: { text: 'lesson' }, request, session: expect.objectContaining({ sub: 'dev-bypass' }),
    });
  });

  it('treats a null body as an empty object', async () => {
    const handler = vi.fn(async () => NextResponse.json({ ok: true }));
    await route(handler)(post('null'));
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ body: {} }));
  });

  it('returns the handler response unchanged', async () => {
    const file = new NextResponse('outline', { status: 200, headers: { 'Content-Disposition': 'attachment; filename="a.md"' } });
    const res = await route(async () => file)(post('{}'));
    expect(res).toBe(file);
  });

  it('passes a PublicError through with its status, message, extra fields and headers', async () => {
    const res = await route(async () => {
      throw new PublicError('Field "prompt" is required.', 429, { extra: { slideIndex: 3 }, headers: { 'Retry-After': '30' } });
    })(post('{}'));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('30');
    expect(await res.json()).toEqual({ error: 'Field "prompt" is required.', slideIndex: 3 });
  });

  it('replaces an unknown error with the failure message and logs the original server-side', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const leak = new Error('LEAK TEXT_PROVIDER_API_KEY is required');
    const res = await route(async () => { throw leak; })(post('{"text":"secret lesson text"}'));

    expect(res.status).toBe(500);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ error: 'Something failed. Please try again.' });
    expect(text).not.toContain('LEAK');
    expect(text).not.toContain('TEXT_PROVIDER_API_KEY');
    expect(consoleError).toHaveBeenCalledWith('[test-route]', leak);
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret lesson text');
  });

  it('handles a thrown non-Error value', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await route(async () => { throw 'raw string LEAK'; })(post('{}'));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Something failed. Please try again.' });
    expect(consoleError).toHaveBeenCalledWith('[test-route]', 'raw string LEAK');
  });

  it('adds route-specific fields from the body to the 500 response', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await route(async () => { throw new Error('boom'); }, {
      errorExtra: (body) => ({ slideIndex: typeof body.slideIndex === 'number' ? body.slideIndex : 0 }),
    })(post('{"slideIndex":5}'));
    expect(await res.json()).toEqual({ error: 'Something failed. Please try again.', slideIndex: 5 });
  });
});
