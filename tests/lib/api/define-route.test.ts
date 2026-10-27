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
  return new NextRequest('http://localhost/api/test', { method: 'POST', body: stream, duplex: 'half', headers: { 'Content-Type': 'application/json' } } as ConstructorParameters<typeof NextRequest>[1]);
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

describe('defineRoute GET and response policy', () => {
  it.each(['GET', 'POST'])('parse none does not read a %s body and supplies an empty context body', async (method) => {
    const request = method === 'GET' ? new NextRequest('http://localhost/api/test') : post('not JSON');
    request.headers.set('Content-Length', '10000');
    const body = vi.spyOn(request, 'body', 'get');
    const json = vi.spyOn(request, 'json');
    const text = vi.spyOn(request, 'text');
    const handler = vi.fn(ok);
    const response = await route(handler, { parse: 'none', maxBodyBytes: 1 })(request);
    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledWith({ input: {}, body: {}, request, session: expect.objectContaining({ sub: 'dev-bypass' }) });
    expect(body).not.toHaveBeenCalled();
    expect(json).not.toHaveBeenCalled();
    expect(text).not.toHaveBeenCalled();
  });

  it('uses failureStatus for unknown failures while retaining the fixed message, extras and server log', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('LEAK TEXT_PROVIDER_API_KEY schema dump');
    const response = await route(async () => { throw error; }, {
      failureStatus: 502, errorExtra: (body) => ({ id: body.id }),
    })(post('{"id":3}'));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'Something failed. Please try again.', id: 3 });
    expect(log).toHaveBeenCalledWith('[test-route]', error);
  });

  it('noStore overrides success caching without losing handler headers or content', async () => {
    const response = await route(async () => new NextResponse('image', {
      status: 201, headers: { 'Content-Disposition': 'inline', 'Cache-Control': 'public, max-age=60' },
    }), { noStore: true })(post('{}'));
    expect(response.status).toBe(201);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('Content-Disposition')).toBe('inline');
    expect(await response.text()).toBe('image');
  });

  it('noStore merges PublicError headers and preserves its status and extra fields', async () => {
    const response = await route(async () => {
      throw new PublicError('Slow down', 429, {
        extra: { retryAfterSeconds: 120 }, headers: { 'Retry-After': '120', 'Cache-Control': 'max-age=60' },
      });
    }, { noStore: true, failureStatus: 502 })(post('{}'));
    expect(response.status).toBe(429);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('Retry-After')).toBe('120');
    expect(await response.json()).toEqual({ error: 'Slow down', retryAfterSeconds: 120 });
  });

  it('noStore applies to unexpected failures', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await route(async () => { throw new Error('internal'); }, { noStore: true })(post('{}'));
    expect(response.status).toBe(500);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({ error: 'Something failed. Please try again.' });
  });

  it.each([
    { body: 'not JSON', status: 400, message: 'Invalid JSON request body.' },
    { body: '{}', status: 400, message: expect.stringMatching(/^Invalid request: query:/) },
    { body: 'x'.repeat(101), status: 413, message: 'Request body exceeds the size limit.' },
  ])('noStore applies to validation failures: $message', async ({ body, status, message }) => {
    const handler = vi.fn(ok);
    const response = await defineRoute({
      name: 'test-route', failureMessage: 'Failed', noStore: true, maxBodyBytes: 100,
      input: z.object({ query: z.string() }), handler,
    })(post(body));
    expect(response.status).toBe(status);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({ error: message });
    expect(handler).not.toHaveBeenCalled();
  });

  it.each(['json', 'none'] as const)('auth still runs first with parse %s and noStore', async (parse) => {
    const denied = NextResponse.json({ error: 'Authentication required.' }, { status: 401, headers: { 'X-Auth': 'denied' } });
    vi.spyOn(sessionAuth, 'requireSession').mockReturnValueOnce({ ok: false, response: denied });
    const request = post('not JSON');
    const body = vi.spyOn(request, 'body', 'get');
    const handler = vi.fn(ok);
    const response = await route(handler, { parse, noStore: true, maxBodyBytes: 1 })(request);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Authentication required.' });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('X-Auth')).toBe('denied');
    expect(body).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('defineRoute multipart parsing and dynamic limits', () => {
  function multipartRequest() {
    // Use wire bytes so cancelling at the cap does not race Node's FormData encoder.
    const bytes = Buffer.concat([
      Buffer.from('--test\r\nContent-Disposition: form-data; name="title"\r\n\r\nLesson\r\n' +
        '--test\r\nContent-Disposition: form-data; name="file"; filename="lesson.pdf"\r\nContent-Type: application/pdf\r\n\r\n'),
      Buffer.from([0, 255, 13, 10, 195, 169]), Buffer.from('\r\n--test--\r\n'),
    ]);
    return new NextRequest('http://localhost/api/test', {
      method: 'POST', body: new Uint8Array(bytes), headers: { 'Content-Type': 'multipart/form-data; boundary=test' },
    });
  }

  it('provides parsed multipart fields and intact file bytes in the form context', async () => {
    const response = await defineRoute({
      name: 'form-test', parse: 'form', failureMessage: 'Failed',
      handler: async ({ form, body }) => {
        expect(body).toEqual({});
        expect(form.get('title')).toBe('Lesson');
        const file = form.get('file') as File;
        expect(file.name).toBe('lesson.pdf');
        expect(file.type).toBe('application/pdf');
        expect(Array.from(new Uint8Array(await file.arrayBuffer()))).toEqual([0, 255, 13, 10, 195, 169]);
        return NextResponse.json({ ok: true });
      },
    })(multipartRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it.each(['text/plain', 'multipart/form-data; boundary=missing'])('rejects malformed form data (%s)', async (contentType) => {
    const handler = vi.fn(ok);
    const response = await route(handler, { parse: 'form' })(new NextRequest('http://localhost/api/test', {
      method: 'POST', body: 'not a form', headers: { 'Content-Type': contentType },
    }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid form data payload.' });
    expect(handler).not.toHaveBeenCalled();
  });

  it.each(['json', 'form'] as const)('evaluates the %s body cap anew for each request', async (parse) => {
    let limit = 10000;
    const cap = vi.fn(() => limit);
    const handler = vi.fn(ok);
    const endpoint = route(handler, { parse, maxBodyBytes: cap });
    const request = () => parse === 'form' ? multipartRequest() : post('{"title":"Lesson"}');
    expect((await endpoint(request())).status).toBe(200);
    limit = 1;
    const rejected = await endpoint(request());
    expect(rejected.status).toBe(413);
    expect(await rejected.json()).toEqual({ error: 'Request body exceeds the size limit.' });
    expect(cap).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('rejects a declared oversized form without reading the stream', async () => {
    const request = multipartRequest();
    request.headers.set('Content-Length', '101');
    const body = vi.spyOn(request, 'body', 'get');
    const handler = vi.fn(ok);
    const response = await route(handler, { parse: 'form', maxBodyBytes: 100 })(request);
    expect(response.status).toBe(413);
    expect(body).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });

  it('cancels a form stream over the cap without Content-Length', async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) { controller.enqueue(new Uint8Array(64)); }, cancel,
    });
    const request = new NextRequest('http://localhost/api/test', {
      method: 'POST', body: stream, duplex: 'half', headers: { 'Content-Type': 'multipart/form-data; boundary=test' },
    } as ConstructorParameters<typeof NextRequest>[1]);
    const handler = vi.fn(ok);
    const response = await route(handler, { parse: 'form', maxBodyBytes: () => 100 })(request);
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: 'Request body exceeds the size limit.' });
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(handler).not.toHaveBeenCalled();
  });

  it('authenticates before evaluating the form cap or accessing the body', async () => {
    vi.spyOn(sessionAuth, 'requireSession').mockReturnValueOnce({
      ok: false, response: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }),
    });
    const request = multipartRequest();
    const body = vi.spyOn(request, 'body', 'get');
    const cap = vi.fn(() => { throw new Error('configuration must not be read'); });
    const handler = vi.fn(ok);
    expect((await route(handler, { parse: 'form', maxBodyBytes: cap })(request)).status).toBe(401);
    expect(cap).not.toHaveBeenCalled(); expect(body).not.toHaveBeenCalled(); expect(handler).not.toHaveBeenCalled();
  });

  it('sanitizes a failing dynamic cap as an unexpected failure, not malformed input', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('LEAK invalid upload configuration');
    const response = await route(ok, { parse: 'form', maxBodyBytes: () => { throw error; } })(multipartRequest());
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Something failed. Please try again.' });
    expect(log).toHaveBeenCalledWith('[test-route]', error);
  });
});
