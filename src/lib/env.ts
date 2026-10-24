import { z } from 'zod';
import { DEFAULT_MAX_UPLOAD_MB } from '@/lib/upload-limits';

type RawEnv = Record<string, string | undefined>;

const textProviderSchema = z.object({
  TEXT_PROVIDER_BASE_URL: z.string().url('TEXT_PROVIDER_BASE_URL must be a valid URL'),
  TEXT_PROVIDER_API_KEY: z.string().min(1, 'TEXT_PROVIDER_API_KEY is required'),
  TEXT_PROVIDER_MODEL: z.string().min(1, 'TEXT_PROVIDER_MODEL is required'),
});

const imageProviderSchema = z.object({
  IMAGE_PROVIDER_BASE_URL: z.string().url('IMAGE_PROVIDER_BASE_URL must be a valid URL').default('https://api.openai.com/v1'),
  IMAGE_PROVIDER_API_KEY: z.string().default('not-configured'),
  IMAGE_PROVIDER_MODEL: z.string().default('dall-e-3'),
  IMAGE_SOURCE: z.enum(['ai', 'pexels', 'auto']).default('auto'),
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
  };
}

export function readImageProviderConfig(raw: RawEnv) {
  const data = parseConfig(imageProviderSchema, raw);
  return {
    baseUrl: data.IMAGE_PROVIDER_BASE_URL,
    apiKey: data.IMAGE_PROVIDER_API_KEY,
    model: data.IMAGE_PROVIDER_MODEL,
    source: data.IMAGE_SOURCE,
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
