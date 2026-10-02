import { z } from 'zod';

const envSchema = z.object({
  TEXT_PROVIDER_BASE_URL: z.string().url('TEXT_PROVIDER_BASE_URL must be a valid URL'),
  TEXT_PROVIDER_API_KEY: z.string().min(1, 'TEXT_PROVIDER_API_KEY is required'),
  TEXT_PROVIDER_MODEL: z.string().min(1, 'TEXT_PROVIDER_MODEL is required'),
  IMAGE_PROVIDER_BASE_URL: z.string().url('IMAGE_PROVIDER_BASE_URL must be a valid URL').default('https://api.openai.com/v1'),
  IMAGE_PROVIDER_API_KEY: z.string().default('not-configured'),
  IMAGE_PROVIDER_MODEL: z.string().default('dall-e-3'),
  PEXELS_API_KEY: z.string().optional(),
  IMAGE_SOURCE: z.enum(['ai', 'pexels', 'auto']).default('auto'),
  MAX_FILE_SIZE_MB: z.coerce.number().positive().default(10),
});

export type RawEnv = z.infer<typeof envSchema>;

export interface AppConfig {
  textProvider: {
    baseUrl: string;
    apiKey: string;
    model: string;
  };
  imageProvider: {
    baseUrl: string;
    apiKey: string;
    model: string;
    source: 'ai' | 'pexels' | 'auto';
  };
  pexels?: {
    apiKey?: string;
  };
  app: {
    maxFileSizeMb: number;
  };
}

export function validateEnv(rawEnv: Record<string, string | undefined> = process.env): AppConfig {
  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    const issues = result.error.issues || [];
    const errorDetails = issues
      .map((err) => `${err.path.join('.') || 'root'}: ${err.message}`)
      .join('; ');
    throw new Error(`Environment validation error: ${errorDetails}`);
  }

  const data = result.data;
  return {
    textProvider: {
      baseUrl: data.TEXT_PROVIDER_BASE_URL,
      apiKey: data.TEXT_PROVIDER_API_KEY,
      model: data.TEXT_PROVIDER_MODEL,
    },
    imageProvider: {
      baseUrl: data.IMAGE_PROVIDER_BASE_URL,
      apiKey: data.IMAGE_PROVIDER_API_KEY,
      model: data.IMAGE_PROVIDER_MODEL,
      source: data.IMAGE_SOURCE,
    },
    pexels: {
      apiKey: data.PEXELS_API_KEY,
    },
    app: {
      maxFileSizeMb: data.MAX_FILE_SIZE_MB,
    },
  };
}

let cachedConfig: AppConfig | null = null;

export function getEnv(): AppConfig {
  if (!cachedConfig) {
    cachedConfig = validateEnv(process.env);
  }
  return cachedConfig;
}

export const env = new Proxy({} as AppConfig, {
  get(_target, prop: keyof AppConfig) {
    return getEnv()[prop];
  },
});
