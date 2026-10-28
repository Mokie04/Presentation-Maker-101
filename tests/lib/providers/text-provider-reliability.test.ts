import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OpenAI from 'openai';
import { createTextProviderClient, generateSlideContent } from '@/lib/providers/text-provider';

const presentation = { subject: 'Science', originalWriters: 'Teacher', topic: 'Water', slides: [] };
const completion = { choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(presentation) } }] };
function clientFor(create: ReturnType<typeof vi.fn>): OpenAI {
  return { chat: { completions: { create } } } as unknown as OpenAI;
}
function generate(create: ReturnType<typeof vi.fn>, options = {}) {
  return generateSlideContent('Lesson', 'Session 1', 'Science', { client: clientFor(create), ...options });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  vi.spyOn(Math, 'random').mockReturnValue(0);
  vi.stubEnv('TEXT_PROVIDER_BASE_URL', 'http://127.0.0.1:9/v1');
  vi.stubEnv('TEXT_PROVIDER_API_KEY', 'test-key');
  vi.stubEnv('TEXT_PROVIDER_MODEL', 'test-model');
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe('bounded text generation', () => {
  it('disables hidden SDK retries and bounds its default attempt timeout', () => {
    const client = createTextProviderClient();
    expect(client.maxRetries).toBe(0);
    expect(client.timeout).toBe(150_000);
  });

  it.each([400, 401, 403, 404, 422])('fails HTTP %i after one call', async status => {
    const error = new OpenAI.APIError(status, {}, 'configuration failure', new Headers());
    const create = vi.fn().mockRejectedValue(error);
    const result = generate(create).catch(value => value);
    await vi.runAllTimersAsync();
    expect(await result).toBe(error);
    expect(create).toHaveBeenCalledOnce();
    expect(Date.now()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([408, 409, 429, 500, 503])('retries HTTP %i then returns valid slides', async status => {
    const create = vi.fn().mockRejectedValueOnce(new OpenAI.APIError(status, {}, 'temporary', new Headers()))
      .mockResolvedValueOnce(completion);
    const result = generate(create);
    await vi.runAllTimersAsync();
    expect(await result).toEqual(presentation);
    expect(create).toHaveBeenCalledTimes(2);
    expect(Date.now()).toBe(1_000);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    ['3', 3_000],
    ['1000', 10_000],
    ['Thu, 01 Jan 1970 00:00:04 GMT', 4_000],
  ])('honors Retry-After %s with a ten-second cap', async (retryAfter, elapsed) => {
    const create = vi.fn().mockRejectedValueOnce(new OpenAI.RateLimitError(429, {}, 'temporary', new Headers({ 'retry-after': retryAfter })))
      .mockResolvedValueOnce(completion);
    const result = generate(create);
    await vi.runAllTimersAsync();
    expect(await result).toEqual(presentation);
    expect(create).toHaveBeenCalledTimes(2);
    expect(Date.now()).toBe(elapsed);
  });

  it.each([new OpenAI.APIConnectionError({ message: 'network' }), new OpenAI.APIConnectionTimeoutError(), new OpenAI.APIConnectionError({ cause: new TypeError('fetch failed') })])
    ('retries network and timeout errors: %s', async error => {
      const create = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce(completion);
      const result = generate(create);
      await vi.runAllTimersAsync();
      expect(await result).toEqual(presentation);
      expect(create).toHaveBeenCalledTimes(2);
    });

  it.each([new Error('unexpected local failure'), new TypeError('Cannot read properties of undefined')])
    ('does not retry an unknown programming error: %s', async error => {
    const create = vi.fn().mockRejectedValue(error);
    const result = generate(create).catch(value => value);
    await vi.runAllTimersAsync();
    expect(await result).toBe(error);
    expect(create).toHaveBeenCalledOnce();
  });

  it.each([null, '{', '{"wrong":true}'])('retries invalid output %s', async content => {
    const create = vi.fn().mockResolvedValueOnce({ choices: [{ message: { content } }] }).mockResolvedValueOnce(completion);
    const result = generate(create);
    await vi.runAllTimersAsync();
    expect(await result).toEqual(presentation);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('uses five default retries with approximately 1, 2, 4, 8 and 16 second backoffs', async () => {
    const create = vi.fn().mockRejectedValue(new OpenAI.APIConnectionError({ message: 'network' }));
    const result = generate(create).catch(value => value);
    await vi.runAllTimersAsync();
    expect(await result).toBeInstanceOf(OpenAI.APIConnectionError);
    expect(create).toHaveBeenCalledTimes(6);
    expect(Date.now()).toBe(31_000);
  });

  it('keeps injected retry counts and exact backoffs working', async () => {
    const create = vi.fn().mockRejectedValue(new OpenAI.APIConnectionError({ message: 'network' }));
    const result = generate(create, { maxRetries: 5, backoffDelays: [10] }).catch(value => value);
    await vi.runAllTimersAsync();
    expect(await result).toBeInstanceOf(OpenAI.APIConnectionError);
    expect(create).toHaveBeenCalledTimes(6);
    expect(Date.now()).toBe(90);
  });

  it('adds small jitter to default backoffs', async () => {
    vi.mocked(Math.random).mockReturnValue(0.5);
    const create = vi.fn().mockRejectedValue(new OpenAI.APIConnectionError({ message: 'network' }));
    const result = generate(create).catch(value => value);
    await vi.runAllTimersAsync();
    expect(await result).toBeInstanceOf(OpenAI.APIConnectionError);
    expect(create).toHaveBeenCalledTimes(6);
    expect(Date.now()).toBe(32_550);
  });

  it('bounds hung calls, shrinks the next timeout, and stops before the overall deadline', async () => {
    const create = vi.fn().mockImplementation(() => new Promise(() => {}));
    let failure: unknown;
    let elapsed: number | undefined;
    const result = generate(create).catch(value => { failure = value; elapsed = Date.now(); });
    await vi.advanceTimersByTimeAsync(270_000);
    expect(failure).toBeInstanceOf(Error);
    expect(elapsed).toBe(265_000);
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[0][1]).toEqual(expect.objectContaining({ timeout: 150_000, maxRetries: 0 }));
    expect(create.mock.calls[1][1]).toEqual(expect.objectContaining({ timeout: 114_000, maxRetries: 0 }));
    expect(create.mock.calls.every(call => call[1].signal.aborted)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    await result;
  });

  it('does not start a retry that cannot fit its backoff and response reserve', async () => {
    const create = vi.fn().mockRejectedValue(new OpenAI.APIConnectionError({ message: 'network' }));
    const result = generate(create, { maxRetries: 20, backoffDelays: [100_000, 100_000] }).catch(value => value);
    await vi.runAllTimersAsync();
    expect(await result).toBeInstanceOf(Error);
    expect(create).toHaveBeenCalledTimes(3);
    expect(Date.now()).toBe(200_000);
  });

  it.each(['attempt', 'backoff', 'before start'])('cancels during %s without another paid call', async phase => {
    const controller = new AbortController();
    const create = phase === 'attempt' ? vi.fn().mockImplementation(() => new Promise(() => {}))
      : vi.fn().mockRejectedValue(new OpenAI.APIConnectionError({ message: 'network' }));
    if (phase === 'before start') controller.abort();
    let failure: unknown;
    const result = generate(create, { signal: controller.signal }).catch(value => { failure = value; });
    await vi.advanceTimersByTimeAsync(100);
    controller.abort();
    await vi.advanceTimersByTimeAsync(1);
    expect(failure).toMatchObject({ name: 'AbortError' });
    expect(create).toHaveBeenCalledTimes(phase === 'before start' ? 0 : 1);
    if (phase === 'attempt') expect(create.mock.calls[0][1].signal.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    await result;
  });

  it('handles a late rejected call after timeout without leaving timers', async () => {
    let rejectCall!: (error: Error) => void;
    const create = vi.fn().mockImplementationOnce(() => new Promise((_, reject) => { rejectCall = reject; }))
      .mockResolvedValueOnce(completion);
    const result = generate(create);
    await vi.advanceTimersByTimeAsync(151_000);
    expect(await result).toEqual(presentation);
    rejectCall(new Error('late failure'));
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
