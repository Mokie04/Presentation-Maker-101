import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateEnv } from '@/lib/env';

describe('validateEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('successfully validates and parses valid environment variables', () => {
    const validRaw = {
      TEXT_PROVIDER_BASE_URL: 'https://api.openai.com/v1',
      TEXT_PROVIDER_API_KEY: 'sk-test-key-text',
      TEXT_PROVIDER_MODEL: 'gpt-4o',
      IMAGE_PROVIDER_BASE_URL: 'https://api.openai.com/v1',
      IMAGE_PROVIDER_API_KEY: 'sk-test-key-image',
      IMAGE_PROVIDER_MODEL: 'dall-e-3',
      MAX_FILE_SIZE_MB: '15',
    };

    const config = validateEnv(validRaw);

    expect(config.textProvider.baseUrl).toBe('https://api.openai.com/v1');
    expect(config.textProvider.apiKey).toBe('sk-test-key-text');
    expect(config.textProvider.model).toBe('gpt-4o');
    expect(config.imageProvider.baseUrl).toBe('https://api.openai.com/v1');
    expect(config.imageProvider.apiKey).toBe('sk-test-key-image');
    expect(config.imageProvider.model).toBe('dall-e-3');
    expect(config.app.maxFileSizeMb).toBe(15);
  });

  it('throws an informative error if required variables are missing', () => {
    const invalidRaw = {
      TEXT_PROVIDER_BASE_URL: 'https://api.openai.com/v1',
      // TEXT_PROVIDER_API_KEY missing
      TEXT_PROVIDER_MODEL: 'gpt-4o',
    };

    expect(() => validateEnv(invalidRaw)).toThrowError(/Environment validation error/);
  });

  it('throws an error if URL is invalid', () => {
    const invalidRaw = {
      TEXT_PROVIDER_BASE_URL: 'not-a-valid-url',
      TEXT_PROVIDER_API_KEY: 'sk-key',
      TEXT_PROVIDER_MODEL: 'gpt-4o',
      IMAGE_PROVIDER_BASE_URL: 'https://api.openai.com/v1',
      IMAGE_PROVIDER_API_KEY: 'sk-image',
      IMAGE_PROVIDER_MODEL: 'dall-e-3',
      MAX_FILE_SIZE_MB: '10',
    };

    expect(() => validateEnv(invalidRaw)).toThrowError(/TEXT_PROVIDER_BASE_URL/);
  });
});
