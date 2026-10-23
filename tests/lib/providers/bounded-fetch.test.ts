import { afterEach, describe, expect, it, vi } from 'vitest';
import { boundedFetch, type BoundedFetchOptions } from '@/lib/providers/bounded-fetch';

const url = 'https://example.test/resource';
function options(fetchFn: typeof fetch): BoundedFetchOptions {
  return { limitBytes: 4, timeoutMs: 100, fetchFn, errors: {
    timeout: () => new Error('deadline'), tooLarge: () => new Error('too large'),
    http: (response) => new Error(`HTTP ${response.status}`),
  } };
}
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('boundedFetch', () => {
  it('rejects Content-Length before acquiring a reader and cancels the body', async () => {
    const cancel = vi.fn();
    const response = new Response(new ReadableStream({ cancel }), { headers: { 'content-length': '5' } });
    const getReader = vi.spyOn(response.body!, 'getReader');
    const config = options(vi.fn<typeof fetch>().mockResolvedValue(response));
    const error = new Error('custom size error');
    config.errors.tooLarge = () => error;
    await expect(boundedFetch(url, config, (_response, read) => read())).rejects.toBe(error);
    expect(getReader).not.toHaveBeenCalled(); expect(cancel).toHaveBeenCalledOnce();
  });

  it('counts cumulative streamed bytes without Content-Length and cancels at the limit', async () => {
    const cancel = vi.fn();
    const pull = vi.fn((controller: ReadableStreamDefaultController<Uint8Array>) => controller.enqueue(new Uint8Array(3)));
    const response = new Response(new ReadableStream({ pull, cancel }, { highWaterMark: 0 }));
    await expect(boundedFetch(url, options(vi.fn<typeof fetch>().mockResolvedValue(response)), (_response, read) => read()))
      .rejects.toThrow('too large');
    expect(pull).toHaveBeenCalledTimes(2); expect(cancel).toHaveBeenCalledOnce();
    expect(response.body?.locked).toBe(false);
  });

  it('returns exact binary bytes at the limit and passes headers and redirect policy', async () => {
    const bytes = new Uint8Array([0, 255, 195, 169]);
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response(bytes));
    const config = { ...options(fetchFn), headers: { 'User-Agent': 'test-agent' } };
    expect(await boundedFetch(url, config, (_response, read) => read())).toEqual(Buffer.from(bytes));
    expect(fetchFn).toHaveBeenCalledWith(url, { redirect: 'error', signal: expect.any(AbortSignal), headers: config.headers });
  });

  it.each(['headers', 'body'])('aborts a stalled %s and uses the supplied timeout error', async (stage) => {
    vi.useFakeTimers();
    const cancel = vi.fn();
    const fetchFn = vi.fn<typeof fetch>().mockImplementation(async () => stage === 'headers'
      ? new Promise<Response>(() => {}) : new Response(new ReadableStream({ cancel })));
    const error = new Error('custom timeout');
    const config = options(fetchFn); config.errors.timeout = () => error;
    const assertion = expect(boundedFetch(url, config, (_response, read) => read())).rejects.toBe(error);
    await vi.advanceTimersByTimeAsync(100); await assertion;
    expect(fetchFn.mock.calls[0][1]?.signal?.aborted).toBe(true);
    if (stage === 'body') expect(cancel).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('uses one deadline across headers and body', async () => {
    vi.useFakeTimers();
    const cancel = vi.fn();
    const fetchFn = vi.fn<typeof fetch>().mockImplementation(() => new Promise((resolve) => {
      setTimeout(() => resolve(new Response(new ReadableStream({ cancel }))), 60);
    }));
    const assertion = expect(boundedFetch(url, options(fetchFn), (_response, read) => read())).rejects.toThrow('deadline');
    await vi.advanceTimersByTimeAsync(100); await assertion;
    expect(cancel).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels a response arriving after timeout without invoking consume', async () => {
    vi.useFakeTimers();
    let finish!: (response: Response) => void;
    const fetchFn = vi.fn<typeof fetch>().mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const consume = vi.fn();
    const assertion = expect(boundedFetch(url, options(fetchFn), consume)).rejects.toThrow('deadline');
    await vi.advanceTimersByTimeAsync(100); await assertion;
    const cancel = vi.fn(); finish(new Response(new ReadableStream({ cancel })));
    await vi.advanceTimersByTimeAsync(0);
    expect(consume).not.toHaveBeenCalled(); expect(cancel).toHaveBeenCalledOnce();
  });

  it.each([false, true])('uses the HTTP error factory (async: %s) and cancels without reading', async (asyncFactory) => {
    const cancel = vi.fn();
    const response = new Response(new ReadableStream({ cancel }), { status: 429 });
    const config = options(vi.fn<typeof fetch>().mockResolvedValue(response));
    const error = new Error('rate limit');
    config.errors.http = vi.fn(() => asyncFactory ? Promise.resolve(error) : error);
    const consume = vi.fn();
    await expect(boundedFetch(url, config, consume)).rejects.toBe(error);
    expect(config.errors.http).toHaveBeenCalledWith(response);
    expect(consume).not.toHaveBeenCalled(); expect(cancel).toHaveBeenCalledOnce();
  });

  it.each([false, true])('rejects browser execution (custom error: %s) without fetching', async (custom) => {
    vi.stubGlobal('window', {});
    const fetchFn = vi.fn<typeof fetch>(); const config = options(fetchFn);
    if (custom) config.errors.serverSideOnly = () => new Error('custom server guard');
    await expect(boundedFetch(url, config, vi.fn())).rejects.toThrow(custom ? 'custom server guard' : 'Bounded fetch is server-side only.');
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it.each(['return', 'throw'])('lets the caller inspect headers before reading and cancels on early %s', async (mode) => {
    const cancel = vi.fn();
    const response = new Response(new ReadableStream({ cancel }), { headers: { 'content-type': 'text/html', 'content-length': '999' } });
    const getReader = vi.spyOn(response.body!, 'getReader');
    const pending = boundedFetch(url, options(vi.fn<typeof fetch>().mockResolvedValue(response)), (response) => {
      expect(response.headers.get('content-type')).toBe('text/html');
      if (mode === 'throw') throw new Error('MIME mismatch');
      return 'skipped';
    });
    if (mode === 'throw') await expect(pending).rejects.toThrow('MIME mismatch');
    else expect(await pending).toBe('skipped');
    expect(getReader).not.toHaveBeenCalled(); expect(cancel).toHaveBeenCalledOnce();
  });

  it('lets a caller read before inspecting the content type', async () => {
    const events: string[] = [];
    const response = new Response(new ReadableStream({ pull(controller) {
      events.push('read'); controller.enqueue(new Uint8Array([1])); controller.close();
    } }, { highWaterMark: 0 }));
    await boundedFetch(url, options(vi.fn<typeof fetch>().mockResolvedValue(response)), async (_response, read) => {
      await read(); events.push('inspect');
    });
    expect(events).toEqual(['read', 'inspect']);
  });

  it.each(['success', 'network', 'http', 'consume', 'read'])('clears its timer after %s', async (stage) => {
    vi.useFakeTimers();
    const response = stage === 'read' ? new Response(new ReadableStream({ pull(controller) { controller.error(new Error('read')); } }))
      : new Response('ok', { status: stage === 'http' ? 500 : 200 });
    const fetchFn = vi.fn<typeof fetch>();
    if (stage === 'network') fetchFn.mockRejectedValue(new Error('network')); else fetchFn.mockResolvedValue(response);
    const pending = boundedFetch(url, options(fetchFn), async (_response, read) => {
      if (stage === 'consume') throw new Error('consume');
      return read();
    });
    if (stage === 'success') await expect(pending).resolves.toEqual(Buffer.from('ok'));
    else await expect(pending).rejects.toThrow();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('preserves cancellation failures on early exits', async () => {
    const response = new Response(new ReadableStream({ cancel() { throw new Error('cancel failed'); } }));
    await expect(boundedFetch(url, options(vi.fn<typeof fetch>().mockResolvedValue(response)), () => { throw new Error('primary'); }))
      .rejects.toThrow('cancel failed');
  });

  it('keeps the timeout error when abort cancellation rejects', async () => {
    vi.useFakeTimers();
    const response = new Response(new ReadableStream({ cancel() { throw new Error('cancel failed'); } }));
    const assertion = expect(boundedFetch(url, options(vi.fn<typeof fetch>().mockResolvedValue(response)), (_response, read) => read()))
      .rejects.toThrow('deadline');
    await vi.advanceTimersByTimeAsync(100); await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('returns empty bytes for an absent body so the caller owns its policy', async () => {
    await expect(boundedFetch(url, options(vi.fn<typeof fetch>().mockResolvedValue(new Response(null))), (_response, read) => read()))
      .resolves.toEqual(Buffer.alloc(0));
  });
});
