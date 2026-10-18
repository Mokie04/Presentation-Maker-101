import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { defineRoute, PublicError } from '@/lib/api';
import { z } from 'zod';
import * as sessionAuth from '@/lib/sessionAuth';

function post(body: string) {
  return new NextRequest('http://localhost/api/test', {
    method: 'POST', body, headers: { 'Content-Type': 'application/json' },
  });
}

/** A body with no Content-Length header, delivered in chunks. */
function streamed(chunks: string[]) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) { chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk))); controller.close(); },
  });
  return new NextRequest('http://localhost/api/test', { method: 'POST', body: stream, duplex: 'half' } as ConstructorParameters<typeof NextRequest>[1]);
}

/** A JSON body of exactly `bytes` bytes. */
function jsonOfSize(bytes: number) {
  const shell = '{"pad":""}';
  return `{"pad":"${'x'.repeat(bytes - shell.length)}"}`;
}

const ok = async () => NextResponse.json({ ok: true });

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
      input: { text: 'lesson' }, body: { text: 'lesson' }, request, session: expect.objectContaining({ sub: 'dev-bypass' }),
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

  describe('input schema', () => {
    const schema = z.object({
      a: z.string(), b: z.string(), c: z.string(), d: z.string(), e: z.string(), f: z.string(),
      secret: z.number(),
    });

    it('rejects invalid input with at most five issues and never echoes the values', async () => {
      const handler = vi.fn(ok);
      const res = await defineRoute({ name: 'test-route', failureMessage: 'x', input: schema, handler })(
        post(JSON.stringify({ secret: 'SECRET-VALUE-123' })));
      expect(res.status).toBe(400);
      const { error } = await res.json();
      expect(error).toMatch(/^Invalid request: a: [^;]+; b: [^;]+; c: [^;]+; d: [^;]+; e: [^;]+$/);
      expect(error.split('; ')).toHaveLength(5);
      expect(error).not.toContain('SECRET-VALUE-123');
      expect(handler).not.toHaveBeenCalled();
    });

    it('reports the secret field without its value when it is the only problem', async () => {
      const res = await defineRoute({ name: 'test-route', failureMessage: 'x', input: z.object({ secret: z.number() }), handler: ok })(
        post(JSON.stringify({ secret: 'SECRET-VALUE-123' })));
      const { error } = await res.json();
      expect(error).toMatch(/^Invalid request: secret: /);
      expect(error).not.toContain('SECRET-VALUE-123');
    });

    it('includes errorExtra in the 400 body', async () => {
      const res = await defineRoute({
        name: 'test-route', failureMessage: 'x', input: z.object({ prompt: z.string() }), handler: ok,
        errorExtra: (body) => ({ slideIndex: typeof body.slideIndex === 'number' ? body.slideIndex : 0 }),
      })(post(JSON.stringify({ slideIndex: 3 })));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: expect.stringMatching(/^Invalid request: prompt: /), slideIndex: 3 });
    });

    it('passes the parsed input and the raw body to the handler', async () => {
      const handler = vi.fn(ok);
      await defineRoute({
        name: 'test-route', failureMessage: 'x',
        input: z.object({ delay: z.number().transform((n) => Math.min(n, 10)) }), handler,
      })(post(JSON.stringify({ delay: 50, extra: true })));
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ input: { delay: 10 }, body: { delay: 50, extra: true } }));
    });
  });

  describe('body size cap', () => {
    const tooLarge = { error: 'Request body exceeds the size limit.' };

    it('rejects a declared Content-Length over the cap without reading the body', async () => {
      const handler = vi.fn(ok);
      const request = new NextRequest('http://localhost/api/test', {
        method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json', 'Content-Length': '101' },
      });
      const res = await route(handler, { maxBodyBytes: 100 })(request);
      expect(res.status).toBe(413);
      expect(await res.json()).toEqual(tooLarge);
      expect(handler).not.toHaveBeenCalled();
    });

    it('cuts off a body without Content-Length that streams past the cap', async () => {
      const handler = vi.fn(ok);
      const res = await route(handler, { maxBodyBytes: 100 })(streamed(['{"pad":"', 'x'.repeat(60), 'x'.repeat(60), '"}']));
      expect(res.status).toBe(413);
      expect(await res.json()).toEqual(tooLarge);
      expect(handler).not.toHaveBeenCalled();
    });

    it('accepts a body of exactly the cap', async () => {
      const handler = vi.fn(ok);
      const res = await route(handler, { maxBodyBytes: 100 })(streamed([jsonOfSize(100)]));
      expect(res.status).toBe(200);
      expect(handler).toHaveBeenCalled();
    });

    it('applies a 1 MiB cap by default', async () => {
      expect((await route(ok)(streamed([jsonOfSize(1024 * 1024)]))).status).toBe(200);
      expect((await route(ok)(streamed([jsonOfSize(1024 * 1024 + 1)]))).status).toBe(413);
    });

    it('answers an unauthenticated oversized request with 401, not 413', async () => {
      const denied = NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
      vi.spyOn(sessionAuth, 'requireSession').mockReturnValueOnce({ ok: false, response: denied });
      const res = await route(ok, { maxBodyBytes: 10 })(streamed([jsonOfSize(1000)]));
      expect(res.status).toBe(401);
    });
  });
});
