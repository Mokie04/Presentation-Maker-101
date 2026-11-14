import { z } from 'zod';
import { DEFAULT_MAX_UPLOAD_MB } from '@/lib/upload-limits';

type RawEnv = Record<string, string | undefined>;

const textProviderSchema = z.object({
  TEXT_PROVIDER_BASE_URL: z.string().url('TEXT_PROVIDER_BASE_URL must be a valid URL'),
  TEXT_PROVIDER_API_KEY: z.string().min(1, 'TEXT_PROVIDER_API_KEY is required'),
  TEXT_PROVIDER_MODEL: z.string().min(1, 'TEXT_PROVIDER_MODEL is required'),
  // Optional `thinking: { type }` request field for providers with reasoning models (for example z.ai GLM).
  // Unset (or empty) sends nothing, so providers that do not know the field get the same request as before.
  TEXT_PROVIDER_THINKING: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.enum(['enabled', 'disabled'], { message: 'TEXT_PROVIDER_THINKING must be enabled or disabled' }).optional()
  ),
});

const imageProviderSchema = z.object({
  IMAGE_PROVIDER_BASE_URL: z.string().url('IMAGE_PROVIDER_BASE_URL must be a valid URL').default('https://api.openai.com/v1'),
  IMAGE_PROVIDER_API_KEY: z.string().default('not-configured'),
  IMAGE_PROVIDER_MODEL: z.string().default('dall-e-3'),
  IMAGE_PROVIDER_SIZE: z.string().regex(/^\d+x\d+$/, 'IMAGE_PROVIDER_SIZE must be a widthxheight size').optional(),
  IMAGE_SOURCE: z.enum(['ai', 'pexels', 'auto']).default('auto'),
  IMAGE_PROVIDER_KIND: z.enum(['openai-compatible', 'invoke-api']).default('openai-compatible'),
  IMAGE_PROVIDER_ASPECT_RATIO: z.string().regex(/^\d+:\d+$/, 'IMAGE_PROVIDER_ASPECT_RATIO must look like 16:9').default('16:9'),
});

const pexelsSchema = z.object({
  PEXELS_API_KEY: z.string().optional(),
});

const appSchema = z.object({
  MAX_FILE_SIZE_MB: z.coerce.number().positive().default(DEFAULT_MAX_UPLOAD_MB),
});

function parseConfig<T extends z.ZodType>(schema: T, raw: RawEnv): z.output<T> {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const errorDetails = result.error.issues
      .map((err) => `${err.path.join('.') || 'root'}: ${err.message}`)
      .join('; ');
    throw new Error(`Environment validation error: ${errorDetails}`);
  }
  return result.data;
}

export function readTextProviderConfig(raw: RawEnv) {
  const data = parseConfig(textProviderSchema, raw);
  return {
    baseUrl: data.TEXT_PROVIDER_BASE_URL,
    apiKey: data.TEXT_PROVIDER_API_KEY,
    model: data.TEXT_PROVIDER_MODEL,
    thinking: data.TEXT_PROVIDER_THINKING,
  };
}

export function readImageProviderConfig(raw: RawEnv) {
  const data = parseConfig(imageProviderSchema, raw);
  if (data.IMAGE_PROVIDER_KIND === 'invoke-api') {
    // The OpenAI-compatible defaults would send the key to the wrong host, so nothing is assumed here.
    const missing = (['IMAGE_PROVIDER_BASE_URL', 'IMAGE_PROVIDER_MODEL'] as const).find((name) => !raw[name]);
    if (missing) throw new Error(`Environment validation error: ${missing} is required when IMAGE_PROVIDER_KIND is invoke-api`);
    if (new URL(data.IMAGE_PROVIDER_BASE_URL).protocol !== 'https:') {
      throw new Error('Environment validation error: IMAGE_PROVIDER_BASE_URL must use https when IMAGE_PROVIDER_KIND is invoke-api');
    }
  }
  const acceptedSizes = data.IMAGE_PROVIDER_MODEL === 'dall-e-3'
    ? ['1792x1024', '1024x1024', '1024x1792']
    : data.IMAGE_PROVIDER_MODEL.startsWith('gpt-image')
      ? ['1536x1024', '1024x1024', '1024x1536'] : undefined;
  const size = data.IMAGE_PROVIDER_SIZE ?? acceptedSizes?.[0] ?? '1024x576';
  if (acceptedSizes && !acceptedSizes.includes(size)) {
    throw new Error(`Environment validation error: IMAGE_PROVIDER_SIZE: must be one of ${acceptedSizes.join(', ')} for ${data.IMAGE_PROVIDER_MODEL}`);
  }
  return {
    baseUrl: data.IMAGE_PROVIDER_BASE_URL,
    apiKey: data.IMAGE_PROVIDER_API_KEY,
    model: data.IMAGE_PROVIDER_MODEL,
    size,
    source: data.IMAGE_SOURCE,
    kind: data.IMAGE_PROVIDER_KIND,
    aspectRatio: data.IMAGE_PROVIDER_ASPECT_RATIO,
  };
}

export function readPexelsConfig(raw: RawEnv) {
  const data = parseConfig(pexelsSchema, raw);
  return { apiKey: data.PEXELS_API_KEY };
}

export function readAppConfig(raw: RawEnv) {
  const data = parseConfig(appSchema, raw);
  return { maxFileSizeMb: data.MAX_FILE_SIZE_MB };
}

let textProviderConfig: ReturnType<typeof readTextProviderConfig> | undefined;
let imageProviderConfig: ReturnType<typeof readImageProviderConfig> | undefined;
let pexelsConfig: ReturnType<typeof readPexelsConfig> | undefined;
let appConfig: ReturnType<typeof readAppConfig> | undefined;

export function getTextProviderConfig() {
  return textProviderConfig ??= readTextProviderConfig(process.env);
}

export function getImageProviderConfig() {
  return imageProviderConfig ??= readImageProviderConfig(process.env);
}

export function getPexelsConfig() {
  return pexelsConfig ??= readPexelsConfig(process.env);
}

export function getAppConfig() {
  return appConfig ??= readAppConfig(process.env);
}

export function resetConfigCache(): void {
  textProviderConfig = undefined;
  imageProviderConfig = undefined;
  pexelsConfig = undefined;
  appConfig = undefined;
}
