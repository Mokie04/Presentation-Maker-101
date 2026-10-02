import OpenAI from 'openai';
import { z } from 'zod';
import { env } from '@/lib/env';
import { SYSTEM_PROMPT, USER_PROMPT_TEMPLATE } from '@/lib/prompts/slide-generation';
import type { PresentationData } from '@/types/presentation';

export const slideDataSchema = z.object({
  slideNumber: z.number(),
  part: z.string(),
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
    baseURL: options?.baseURL ?? env.textProvider.baseUrl,
    apiKey: options?.apiKey ?? env.textProvider.apiKey,
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
}

const DEFAULT_BACKOFF_DELAYS = [1000, 2000, 4000, 8000, 16000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateSlideContent(
  lessonText: string,
  session: string,
  detectedSubject: string,
  options?: GenerateSlideOptions
): Promise<PresentationData> {
  const client = options?.client ?? getTextProviderClient();
  const maxRetries = options?.maxRetries ?? 5;
  const backoffDelays = options?.backoffDelays ?? DEFAULT_BACKOFF_DELAYS;

  let lastError: unknown;

  // 1 initial attempt + maxRetries
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model: env.textProvider.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: USER_PROMPT_TEMPLATE(lessonText, session, detectedSubject),
          },
        ],
        response_format: { type: 'json_object' },
      });

      const messageContent = response.choices?.[0]?.message?.content;
      if (!messageContent) {
        throw new Error('Empty response content received from text provider.');
      }

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(messageContent);
      } catch (parseErr) {
        throw new Error(`Failed to parse model JSON: ${String(parseErr)}`);
      }

      const validated = presentationDataSchema.safeParse(parsedJson);
      if (!validated.success) {
        const issues = validated.error.issues || [];
        const msg = issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
        throw new Error(`Model response failed PresentationData schema validation: ${msg}`);
      }

      return validated.data as PresentationData;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = backoffDelays[attempt] ?? (backoffDelays[backoffDelays.length - 1] * 2);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}
