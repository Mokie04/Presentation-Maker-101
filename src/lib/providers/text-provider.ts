import OpenAI from 'openai';
import { z } from 'zod';
import { getTextProviderConfig } from '@/lib/env';
import { canonicalPart } from '@/lib/pedagogy';
import { SYSTEM_PROMPT, USER_PROMPT_TEMPLATE } from '@/lib/prompts/slide-generation';
import type { PresentationData } from '@/types/presentation';

const ATTEMPT_TIMEOUT_MS = 150_000;
const GENERATION_DEADLINE_MS = 270_000;
const RESPONSE_RESERVE_MS = 5_000;
const MIN_ATTEMPT_MS = 1_000;
const MAX_RETRY_AFTER_MS = 10_000;
/** Retries after the first attempt; every retry still has to fit the overall deadline. */
const DEFAULT_MAX_RETRIES = 5;
/** Waits before retries 1–5 (about 31 s in total), each with up to BACKOFF_JITTER extra. */
const DEFAULT_BACKOFF_DELAYS = [1_000, 2_000, 4_000, 8_000, 16_000];
const BACKOFF_JITTER = 0.1;

/** No further attempt fits the overall deadline; `cause` is the last attempt's failure, if any. */
export class TextGenerationDeadlineError extends Error {
  constructor(cause?: unknown) {
    super('Text generation deadline exceeded.', { cause });
    this.name = 'TextGenerationDeadlineError';
  }
}

/** A completed request whose model output stopped at its output limit. */
export class TextOutputTruncatedError extends Error {
  constructor() {
    super('Text provider output was truncated.');
    this.name = 'TextOutputTruncatedError';
  }
}

export const slideDataSchema = z.object({
  slideNumber: z.number(),
  // Canonical name when recognizable, so exports and badges agree; unknown parts pass through.
  part: z.string().transform(canonicalPart),
  title: z.string(),
  contentPoints: z.array(z.string()),
  visualDescription: z.string(),
});

export const presentationDataSchema = z.object({
  subject: z.string(),
  originalWriters: z.string(),
  topic: z.string(),
  slides: z.array(slideDataSchema),
});

export function createTextProviderClient(options?: {
  baseURL?: string;
  apiKey?: string;
}): OpenAI {
  return new OpenAI({
    baseURL: options?.baseURL ?? getTextProviderConfig().baseUrl,
    apiKey: options?.apiKey ?? getTextProviderConfig().apiKey,
    maxRetries: 0,
    timeout: ATTEMPT_TIMEOUT_MS,
  });
}

let defaultTextClient: OpenAI | null = null;

export function getTextProviderClient(): OpenAI {
  if (!defaultTextClient) {
    defaultTextClient = createTextProviderClient();
  }
  return defaultTextClient;
}

export interface GenerateSlideOptions {
  client?: OpenAI;
  maxRetries?: number;
  backoffDelays?: number[];
  signal?: AbortSignal;
}

/** Empty, unparsable or schema-invalid model output; retried like a transient failure. */
class RetryableResponseError extends Error {}

function isRetryable(error: unknown): boolean {
  if (error instanceof OpenAI.APIError && error.status !== undefined) {
    return [408, 409, 429].includes(error.status) || (error.status >= 500 && error.status < 600);
  }
  return error instanceof OpenAI.APIConnectionError || error instanceof RetryableResponseError;
}

/**
 * How a final text-generation failure should be explained to the teacher:
 * - `unavailable`: the upstream service was busy or unreachable (5xx, 408, 429, network error, timeout);
 * - `invalid-output`: the service answered, but the output was empty, not JSON or not the expected shape;
 * - `other`: configuration errors, cancellation and anything unexpected.
 * A deadline stop is explained by the failure of the last attempt that ran.
 */
export type TextFailureKind = 'unavailable' | 'invalid-output' | 'other';

export function classifyTextFailure(error: unknown): TextFailureKind {
  if (error instanceof TextGenerationDeadlineError) {
    return error.cause === undefined ? 'unavailable' : classifyTextFailure(error.cause);
  }
  if (error instanceof RetryableResponseError) return 'invalid-output';
  if (error instanceof OpenAI.APIConnectionError) return 'unavailable';
  if (error instanceof OpenAI.APIError && error.status !== undefined) {
    return [408, 429].includes(error.status) || (error.status >= 500 && error.status < 600) ? 'unavailable' : 'other';
  }
  return 'other';
}

function retryAfterMs(error: unknown): number | undefined {
  if (!(error instanceof OpenAI.APIError) || error.status !== 429) return undefined;
  const value = error.headers?.get('retry-after');
  if (!value?.trim()) return undefined;
  const seconds = Number(value);
  const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - Date.now();
  return Number.isFinite(delay) && delay >= 0 ? Math.min(delay, MAX_RETRY_AFTER_MS) : undefined;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const onAbort = () => { clearTimeout(timer); reject(signal?.reason); };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

// The SDK also gets this timeout and signal. The race bounds injected clients or
// transports that ignore cancellation; late rejections remain handled by race.
async function boundedAttempt<T>(
  operation: (signal: AbortSignal) => PromiseLike<T>,
  timeout: number,
  signal?: AbortSignal
): Promise<T> {
  signal?.throwIfAborted();
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  const cancelled = new Promise<never>((_, reject) => {
    onAbort = () => { controller.abort(signal?.reason); reject(signal?.reason); };
    signal?.addEventListener('abort', onAbort, { once: true });
    timer = setTimeout(() => {
      const error = new OpenAI.APIConnectionTimeoutError();
      controller.abort(error);
      reject(error);
    }, timeout);
  });
  try {
    return await Promise.race([operation(controller.signal), cancelled]);
  } finally {
    clearTimeout(timer);
    if (onAbort) signal?.removeEventListener('abort', onAbort);
  }
}

export async function generateSlideContent(
  lessonText: string,
  session: string,
  detectedSubject: string,
  options?: GenerateSlideOptions
): Promise<PresentationData> {
  const signal = options?.signal;
  signal?.throwIfAborted();
  const deadline = Date.now() + GENERATION_DEADLINE_MS;
  const client = options?.client ?? getTextProviderClient();
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const backoffDelays = options?.backoffDelays ?? DEFAULT_BACKOFF_DELAYS;

  let lastError: unknown;

  // 1 initial attempt + maxRetries
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    signal?.throwIfAborted();
    const timeout = Math.min(ATTEMPT_TIMEOUT_MS, deadline - Date.now() - RESPONSE_RESERVE_MS);
    if (timeout < MIN_ATTEMPT_MS) throw new TextGenerationDeadlineError(lastError);
    try {
      const response = await boundedAttempt(attemptSignal => client.chat.completions.create({
        model: getTextProviderConfig().model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: USER_PROMPT_TEMPLATE(lessonText, session, detectedSubject),
          },
        ],
        response_format: { type: 'json_object' },
      }, { timeout, maxRetries: 0, signal: attemptSignal }), timeout, signal);

      if (response.choices?.[0]?.finish_reason === 'length') throw new TextOutputTruncatedError();
      const messageContent = response.choices?.[0]?.message?.content;
      if (!messageContent) {
        throw new RetryableResponseError('Empty response content received from text provider.');
      }

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(messageContent);
      } catch (parseErr) {
        throw new RetryableResponseError(`Failed to parse model JSON: ${String(parseErr)}`);
      }

      const validated = presentationDataSchema.safeParse(parsedJson);
      if (!validated.success) {
        const issues = validated.error.issues || [];
        const msg = issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
        throw new RetryableResponseError(`Model response failed PresentationData schema validation: ${msg}`);
      }

      return validated.data as PresentationData;
    } catch (err) {
      signal?.throwIfAborted();
      if (err instanceof TextOutputTruncatedError || !isRetryable(err)) throw err;
      lastError = err;
      if (attempt < maxRetries) {
        const baseDelay = backoffDelays[attempt] ?? (backoffDelays[backoffDelays.length - 1] ?? 1000) * 2;
        // Injected backoffs remain exact for existing callers and deterministic tests.
        const delay = retryAfterMs(err) ?? (options?.backoffDelays ? baseDelay : baseDelay * (1 + Math.random() * BACKOFF_JITTER));
        if (delay + RESPONSE_RESERVE_MS + MIN_ATTEMPT_MS > deadline - Date.now()) {
          throw new TextGenerationDeadlineError(err);
        }
        await sleep(delay, signal);
      }
    }
  }

  throw lastError;
}
