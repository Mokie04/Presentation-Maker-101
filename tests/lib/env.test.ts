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
    expect(config.auth.enabled).toBe(false);
    expect(config.auth.audience).toBe('presentation-maker');
  });

  it('normalizes App Store auth settings and clamps bounded values', () => {
    const config = validateEnv({
      TEXT_PROVIDER_BASE_URL: 'https://api.openai.com/v1',
      TEXT_PROVIDER_API_KEY: 'sk-test-key-text',
      TEXT_PROVIDER_MODEL: 'gpt-4o',
      IMAGE_PROVIDER_BASE_URL: 'https://api.openai.com/v1',
      IMAGE_PROVIDER_API_KEY: 'sk-test-key-image',
      IMAGE_PROVIDER_MODEL: 'dall-e-3',
      APPSTORE_AUTH_ENABLED: 'true',
      APPSTORE_SHARED_SECRET: 'test-shared-secret',
      APPSTORE_AUDIENCE: 'custom-audience',
      APPSTORE_ALLOWED_CLOCK_SKEW_SECONDS: '999',
      APPSTORE_MAX_TOKEN_TTL_SECONDS: '1',
      APPSTORE_SESSION_MAX_AGE_SECONDS: '999999',
      APPSTORE_COOKIE_SAMESITE: 'none',
      APPSTORE_COOKIE_SECURE: 'false',
      APPSTORE_COOKIE_DOMAIN: 'example.com',
    });

    expect(config.auth.enabled).toBe(true);
    expect(config.auth.sharedSecret).toBe('test-shared-secret');
    expect(config.auth.audience).toBe('custom-audience');
    expect(config.auth.allowedClockSkewSeconds).toBe(120);
    expect(config.auth.maxTokenTtlSeconds).toBe(30);
    expect(config.auth.sessionMaxAgeSeconds).toBe(86400);
    expect(config.auth.cookieSameSite).toBe('none');
    expect(config.auth.cookieSecure).toBe(true);
    expect(config.auth.cookieDomain).toBe('example.com');
  });

  it('fails closed for invalid production auth configuration', () => {
    const productionEnv = {
      TEXT_PROVIDER_BASE_URL: 'https://api.openai.com/v1',
      TEXT_PROVIDER_API_KEY: 'sk-test-key-text',
      TEXT_PROVIDER_MODEL: 'gpt-4o',
      IMAGE_PROVIDER_BASE_URL: 'https://api.openai.com/v1',
      IMAGE_PROVIDER_API_KEY: 'sk-test-key-image',
      IMAGE_PROVIDER_MODEL: 'dall-e-3',
      NODE_ENV: 'production',
      APPSTORE_AUTH_ENABLED: 'false',
      APPSTORE_SHARED_SECRET: 'test-shared-secret',
    };

    expect(() => validateEnv(productionEnv)).toThrowError(/auth configuration/i);

    expect(() =>
      validateEnv({
        ...productionEnv,
        APPSTORE_AUTH_ENABLED: 'true',
        APPSTORE_SHARED_SECRET: '',
      })
    ).toThrowError(/auth configuration/i);
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
