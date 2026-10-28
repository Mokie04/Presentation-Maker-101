import { writeFileSync } from 'node:fs';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import OpenAI from 'openai';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/generate/route';
import * as provider from '@/lib/providers/text-provider';

// Exact teacher-facing texts; they must never carry upstream detail.
const BUSY = 'The AI service is busy right now. Please try again in a minute.';
const UNUSABLE = 'The AI could not format this lesson. Please try again, or try a shorter part of the lesson plan.';
const GENERIC = 'Failed to generate the presentation. Please try again.';
const TOO_LONG = 'This lesson is too long to convert in one pass. Choose a shorter session or paste a smaller part of the lesson plan.';
// Recognisable upstream text that must stay in server logs only.
const MARKER = 'UPSTREAM-MARKER-7f3a';

const presentation = { subject: 'Science', originalWriters: 'Teacher', topic: 'Water', slides: [] };
const completion = { choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(presentation) } }] };
const output = (content: string | null, finish_reason = 'stop') => ({ choices: [{ finish_reason, message: { content } }] });
const upstream = (status: number, headers: Record<string, string> = {}) =>
  new OpenAI.APIError(status, { error: { message: `${MARKER} status ${status}` } }, `${MARKER} status ${status}`, new Headers(headers));
const network = () => new OpenAI.APIConnectionError({ message: `${MARKER} connection reset` });
const hung = () => new Promise(() => {});
/** Fails with `error` after `ms`, like a slow upstream response. */
const slow = (ms: number, error: unknown) => () => new Promise((_, reject) => setTimeout(() => reject(error), ms));

type Outcome = { status: 200 } | { status: number; error: string };
interface Scenario {
  name: string;
  create: () => Mock;
  options?: provider.GenerateSlideOptions;
  /** 'before' aborts before the call; a number aborts after that many fake milliseconds. */
  abort?: 'before' | number;
  calls: number;
  elapsed: number;
  outcome: Outcome;
}

const repeat = (value: () => unknown, times: number, mock = vi.fn()) => {
  for (let i = 0; i < times; i++) mock.mockImplementationOnce(() => Promise.reject(value()));
  return mock;
};

const scenarios: Scenario[] = [
  { name: 'five 5xx then success on the sixth attempt', create: () => repeat(() => upstream(503), 5).mockResolvedValueOnce(completion),
    calls: 6, elapsed: 31_000, outcome: { status: 200 } },
  { name: 'six consecutive 5xx', create: () => vi.fn().mockImplementation(() => Promise.reject(upstream(500))),
    calls: 6, elapsed: 31_000, outcome: { status: 503, error: BUSY } },
  { name: 'six consecutive network errors', create: () => vi.fn().mockImplementation(() => Promise.reject(network())),
    calls: 6, elapsed: 31_000, outcome: { status: 503, error: BUSY } },
  { name: 'fast 5xx with long injected backoffs stop inside the deadline',
    create: () => vi.fn().mockImplementation(() => Promise.reject(upstream(502))), options: { maxRetries: 20, backoffDelays: [60_000] },
    calls: 3, elapsed: 180_000, outcome: { status: 503, error: BUSY } },
  { name: 'slow 5xx (60 s each) stop before six attempts', create: () => vi.fn().mockImplementation(slow(60_000, upstream(504))),
    calls: 5, elapsed: 265_000, outcome: { status: 503, error: BUSY } },
  { name: 'hung attempts time out and stop at the deadline', create: () => vi.fn().mockImplementation(hung),
    calls: 2, elapsed: 265_000, outcome: { status: 503, error: BUSY } },
  { name: '429 with Retry-After 3 then success', create: () => repeat(() => upstream(429, { 'retry-after': '3' }), 1).mockResolvedValueOnce(completion),
    calls: 2, elapsed: 3_000, outcome: { status: 200 } },
  { name: 'repeated 429 with Retry-After 1000 (capped at 10 s)', create: () => vi.fn().mockImplementation(() => Promise.reject(upstream(429, { 'retry-after': '1000' }))),
    calls: 6, elapsed: 50_000, outcome: { status: 503, error: BUSY } },
  { name: 'repeated 408', create: () => vi.fn().mockImplementation(() => Promise.reject(upstream(408))),
    calls: 6, elapsed: 31_000, outcome: { status: 503, error: BUSY } },
  ...[400, 401, 403, 404, 422].map((status): Scenario => ({
    name: `HTTP ${status} fails fast`, create: () => vi.fn().mockImplementation(() => Promise.reject(upstream(status))),
    calls: 1, elapsed: 0, outcome: { status: 500, error: GENERIC },
  })),
  { name: 'repeated 409 is retried but keeps the generic message', create: () => vi.fn().mockImplementation(() => Promise.reject(upstream(409))),
    calls: 6, elapsed: 31_000, outcome: { status: 500, error: GENERIC } },
  { name: 'repeated empty output', create: () => vi.fn().mockResolvedValue(output(null)),
    calls: 6, elapsed: 31_000, outcome: { status: 502, error: UNUSABLE } },
  { name: 'repeated invalid JSON output', create: () => vi.fn().mockResolvedValue(output(`${MARKER} not json`)),
    calls: 6, elapsed: 31_000, outcome: { status: 502, error: UNUSABLE } },
  { name: 'repeated schema-invalid output', create: () => vi.fn().mockResolvedValue(output(JSON.stringify({ [MARKER]: true }))),
    calls: 6, elapsed: 31_000, outcome: { status: 502, error: UNUSABLE } },
  { name: 'five 5xx then invalid output (final failure decides)', create: () => repeat(() => upstream(500), 5).mockResolvedValueOnce(output('{')),
    calls: 6, elapsed: 31_000, outcome: { status: 502, error: UNUSABLE } },
  { name: 'truncated output', create: () => vi.fn().mockResolvedValue(output(`${MARKER} partial`, 'length')),
    calls: 1, elapsed: 0, outcome: { status: 422, error: TOO_LONG } },
  { name: 'abort before the first attempt', create: () => vi.fn().mockResolvedValue(completion), abort: 'before',
    calls: 0, elapsed: 0, outcome: { status: 500, error: GENERIC } },
  { name: 'abort during an attempt', create: () => vi.fn().mockImplementation(hung), abort: 100,
    calls: 1, elapsed: 100, outcome: { status: 500, error: GENERIC } },
  { name: 'abort between attempts', create: () => vi.fn().mockImplementation(() => Promise.reject(upstream(503))), abort: 100,
    calls: 1, elapsed: 100, outcome: { status: 500, error: GENERIC } },
];

function request() {
  return new NextRequest('http://localhost/api/generate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'A lesson about water', session: 'Session 1' }),
  });
}

/** Runs the real provider on fake timers, then sends its result through the real route mapping. */
async function run(scenario: Scenario) {
  const create = scenario.create();
  const controller = new AbortController();
  if (scenario.abort === 'before') controller.abort();
  let result: { value: unknown } | { error: unknown } | undefined;
  let elapsed: number | undefined;
  const pending = provider.generateSlideContent('Lesson', 'Session 1', 'Science', {
    client: { chat: { completions: { create } } } as unknown as OpenAI, signal: controller.signal, ...scenario.options,
  }).then(value => { result = { value }; elapsed = Date.now(); }, error => { result = { error }; elapsed = Date.now(); });
  if (typeof scenario.abort === 'number') {
    await vi.advanceTimersByTimeAsync(scenario.abort);
    controller.abort();
  }
  await vi.runAllTimersAsync();
  await pending;
  expect(vi.getTimerCount()).toBe(0);
  vi.useRealTimers();

  const spy = vi.spyOn(provider, 'generateSlideContent');
  if (result && 'value' in result) spy.mockResolvedValueOnce(result.value as never);
  else spy.mockRejectedValueOnce(result?.error);
  const response = await POST(request());
  return { create, result, elapsed, response, body: await response.text() };
}

const rows: { scenario: string; calls: number; elapsedMs: number; status: number }[] = [];

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  vi.spyOn(Math, 'random').mockReturnValue(0);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubEnv('TEXT_PROVIDER_BASE_URL', 'http://127.0.0.1:9/v1');
  vi.stubEnv('TEXT_PROVIDER_API_KEY', 'test-key');
  vi.stubEnv('TEXT_PROVIDER_MODEL', 'test-model');
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllEnvs(); });
// Set RETRY_SCENARIO_REPORT to a file path to record the observed calls and elapsed times.
afterAll(() => {
  if (process.env.RETRY_SCENARIO_REPORT) writeFileSync(process.env.RETRY_SCENARIO_REPORT, JSON.stringify(rows, null, 2));
});

describe('text retry policy scenarios', () => {
  it.each(scenarios.map(scenario => [scenario.name, scenario] as const))('%s', async (_, scenario) => {
    const { create, result, elapsed, response, body } = await run(scenario);
    rows.push({ scenario: scenario.name, calls: create.mock.calls.length, elapsedMs: elapsed ?? -1, status: response.status });
    expect(create).toHaveBeenCalledTimes(scenario.calls);
    expect(elapsed).toBe(scenario.elapsed);
    expect(elapsed).toBeLessThanOrEqual(265_000);
    expect(response.status).toBe(scenario.outcome.status);
    if ('error' in scenario.outcome) expect(JSON.parse(body)).toEqual({ error: scenario.outcome.error });
    expect(body).not.toContain(MARKER);
    if (scenario.abort !== undefined) expect(result).toMatchObject({ error: { name: 'AbortError' } });
  });
});

describe('provider-neutral failure messages', () => {
  it.each([
    ['upstream 5xx', upstream(503)],
    ['network error', network()],
    ['deadline after an upstream timeout', new provider.TextGenerationDeadlineError(new OpenAI.APIConnectionTimeoutError({ message: MARKER }))],
  ])('maps %s to 503 with only the busy message and keeps the detail in server logs', async (_, error) => {
    vi.useRealTimers();
    vi.spyOn(provider, 'generateSlideContent').mockRejectedValueOnce(error);
    const response = await POST(request());
    const body = await response.text();
    expect(response.status).toBe(503);
    expect(JSON.parse(body)).toEqual({ error: BUSY });
    expect(body).not.toContain(MARKER);
    expect(console.error).toHaveBeenCalledWith('[generate]', error);
  });

  it('maps exhausted unusable output to 502 with only the formatting message', async () => {
    const { response, body } = await run(scenarios.find(scenario => scenario.name === 'repeated invalid JSON output')!);
    expect(response.status).toBe(502);
    expect(JSON.parse(body)).toEqual({ error: UNUSABLE });
    expect(body).not.toContain(MARKER);
    expect(String(vi.mocked(console.error).mock.calls[0]?.[1])).toContain('Failed to parse model JSON');
  });
});
