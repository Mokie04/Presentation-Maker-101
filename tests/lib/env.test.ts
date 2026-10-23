import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  readTextProviderConfig, readImageProviderConfig, readPexelsConfig, readAppConfig,
  getTextProviderConfig, getImageProviderConfig, getPexelsConfig, getAppConfig,
  resetConfigCache,
} from '@/lib/env';
import { getAppStoreAuthConfig } from '@/lib/sessionAuth';

const textEnv = {
  TEXT_PROVIDER_BASE_URL: 'https://api.openai.com/v1',
  TEXT_PROVIDER_API_KEY: 'test-text-key',
  TEXT_PROVIDER_MODEL: 'gpt-4o',
};
const invalidEnv = {
  TEXT_PROVIDER_BASE_URL: 'invalid-url',
  TEXT_PROVIDER_API_KEY: '',
  TEXT_PROVIDER_MODEL: '',
  IMAGE_PROVIDER_BASE_URL: 'invalid-url',
  IMAGE_SOURCE: 'invalid-source',
  MAX_FILE_SIZE_MB: '-1',
  NODE_ENV: 'production',
  APPSTORE_AUTH_ENABLED: 'false',
};

describe('readTextProviderConfig', () => {
  it('parses text settings without validating other features or auth', () => {
    expect(readTextProviderConfig({ ...invalidEnv, ...textEnv })).toEqual({
      baseUrl: 'https://api.openai.com/v1', apiKey: 'test-text-key', model: 'gpt-4o',
    });
  });

  it.each(['TEXT_PROVIDER_BASE_URL', 'TEXT_PROVIDER_API_KEY', 'TEXT_PROVIDER_MODEL'])('requires %s', (key) => {
    expect(() => readTextProviderConfig({ ...textEnv, [key]: undefined }))
      .toThrow(`Environment validation error: ${key}:`);
  });

  it.each([
    ['TEXT_PROVIDER_BASE_URL', 'not-a-valid-url', 'TEXT_PROVIDER_BASE_URL must be a valid URL'],
    ['TEXT_PROVIDER_API_KEY', '', 'TEXT_PROVIDER_API_KEY is required'],
    ['TEXT_PROVIDER_MODEL', '', 'TEXT_PROVIDER_MODEL is required'],
  ])('rejects invalid %s with the existing message', (key, value, message) => {
    expect(() => readTextProviderConfig({ ...textEnv, [key]: value }))
      .toThrow(`Environment validation error: ${key}: ${message}`);
  });

  it('reports only text errors, joined in schema order', () => {
    expect(() => readTextProviderConfig(invalidEnv)).toThrow(
      'Environment validation error: TEXT_PROVIDER_BASE_URL: TEXT_PROVIDER_BASE_URL must be a valid URL; ' +
      'TEXT_PROVIDER_API_KEY: TEXT_PROVIDER_API_KEY is required; TEXT_PROVIDER_MODEL: TEXT_PROVIDER_MODEL is required'
    );
  });
});

describe('readImageProviderConfig', () => {
  it('uses the existing defaults without text settings', () => {
    expect(readImageProviderConfig({})).toEqual({
      baseUrl: 'https://api.openai.com/v1', apiKey: 'not-configured', model: 'dall-e-3', source: 'auto',
    });
  });

  it.each(['ai', 'pexels', 'auto'])('parses the %s source independently of other features', (source) => {
    expect(readImageProviderConfig({
      ...invalidEnv, IMAGE_PROVIDER_BASE_URL: 'https://images.example/v1',
      IMAGE_PROVIDER_API_KEY: 'test-image-key', IMAGE_PROVIDER_MODEL: 'image-model', IMAGE_SOURCE: source,
    })).toEqual({ baseUrl: 'https://images.example/v1', apiKey: 'test-image-key', model: 'image-model', source });
  });

  it('continues to accept empty image key and model strings', () => {
    expect(readImageProviderConfig({ IMAGE_PROVIDER_API_KEY: '', IMAGE_PROVIDER_MODEL: '' }))
      .toMatchObject({ apiKey: '', model: '' });
  });

  it('reports only the invalid image URL', () => {
    expect(() => readImageProviderConfig({ ...invalidEnv, IMAGE_SOURCE: 'auto' })).toThrow(
      'Environment validation error: IMAGE_PROVIDER_BASE_URL: IMAGE_PROVIDER_BASE_URL must be a valid URL'
    );
  });

  it('reports only the invalid image source', () => {
    expect(() => readImageProviderConfig({ ...invalidEnv, IMAGE_PROVIDER_BASE_URL: undefined })).toThrow(
      'Environment validation error: IMAGE_SOURCE: Invalid option: expected one of "ai"|"pexels"|"auto"'
    );
  });
});

describe('readPexelsConfig', () => {
  it('allows a missing API key without validating other features', () => {
    expect(readPexelsConfig(invalidEnv)).toEqual({ apiKey: undefined });
  });

  it.each(['', 'test-pexels-key'])('preserves the optional key %j', (apiKey) => {
    expect(readPexelsConfig({ ...invalidEnv, PEXELS_API_KEY: apiKey })).toEqual({ apiKey });
  });
});

describe('readAppConfig', () => {
  it('defaults the upload limit to 10 MB without provider settings', () => {
    expect(readAppConfig({})).toEqual({ maxFileSizeMb: 10 });
  });

  it('coerces a positive size independently of providers and auth', () => {
    expect(readAppConfig({ ...invalidEnv, MAX_FILE_SIZE_MB: '15.5' })).toEqual({ maxFileSizeMb: 15.5 });
  });

  it.each(['0', '-1', '', 'not-a-number', 'Infinity'])('rejects size %j with only the upload variable in the error', (value) => {
    expect(() => readAppConfig({ ...invalidEnv, MAX_FILE_SIZE_MB: value })).toThrow(
      /^Environment validation error: MAX_FILE_SIZE_MB: [^;]+$/
    );
  });
});

describe('lazy configuration accessors', () => {
  beforeEach(() => { resetConfigCache(); });
  afterEach(() => { vi.unstubAllEnvs(); resetConfigCache(); });

  it('does not read a feature until its accessor is called', () => {
    vi.stubEnv('TEXT_PROVIDER_API_KEY', undefined);
    vi.stubEnv('IMAGE_PROVIDER_BASE_URL', undefined);
    vi.stubEnv('IMAGE_PROVIDER_API_KEY', undefined);
    vi.stubEnv('IMAGE_PROVIDER_MODEL', undefined);
    vi.stubEnv('IMAGE_SOURCE', undefined);
    vi.stubEnv('MAX_FILE_SIZE_MB', undefined);
    vi.stubEnv('PEXELS_API_KEY', undefined);
    expect(getAppConfig()).toEqual({ maxFileSizeMb: 10 });
    expect(getImageProviderConfig().model).toBe('dall-e-3');
    expect(getPexelsConfig()).toEqual({ apiKey: undefined });
    // The text config is still unread, so these later values must be used.
    for (const [key, value] of Object.entries(textEnv)) vi.stubEnv(key, value);
    expect(getTextProviderConfig().model).toBe('gpt-4o');
  });

  it.each([
    { get: getTextProviderConfig, key: 'TEXT_PROVIDER_MODEL', first: 'first-model', second: 'second-model', field: 'model' },
    { get: getImageProviderConfig, key: 'IMAGE_PROVIDER_MODEL', first: 'first-image', second: 'second-image', field: 'model' },
    { get: getPexelsConfig, key: 'PEXELS_API_KEY', first: 'first-key', second: 'second-key', field: 'apiKey' },
    { get: getAppConfig, key: 'MAX_FILE_SIZE_MB', first: '15', second: '20', field: 'maxFileSizeMb' },
  ])('caches $key until resetConfigCache is called', ({ get, key, first, second, field }) => {
    for (const [name, value] of Object.entries(textEnv)) vi.stubEnv(name, value);
    vi.stubEnv(key, first);
    const initial = get();
    vi.stubEnv(key, second);
    expect(get()).toBe(initial);
    resetConfigCache();
    expect(get()).toHaveProperty(field, key === 'MAX_FILE_SIZE_MB' ? 20 : second);
  });

  it('does not cache a validation failure or poison another feature', () => {
    for (const [key, value] of Object.entries(textEnv)) vi.stubEnv(key, value);
    vi.stubEnv('TEXT_PROVIDER_API_KEY', '');
    vi.stubEnv('MAX_FILE_SIZE_MB', '15');
    expect(getTextProviderConfig).toThrow('TEXT_PROVIDER_API_KEY');
    expect(getAppConfig()).toEqual({ maxFileSizeMb: 15 });
    vi.stubEnv('TEXT_PROVIDER_API_KEY', 'fixed-key');
    expect(getTextProviderConfig().apiKey).toBe('fixed-key');
  });
});

// Retain the former aggregate config's auth assertions at the existing auth boundary.
describe('independent App Store auth configuration', () => {
  it('uses the existing local defaults without provider settings', () => {
    expect(getAppStoreAuthConfig({})).toMatchObject({ enabled: false, audience: 'presentation-maker' });
  });

  it('normalizes App Store auth settings and clamps bounded values', () => {
    expect(getAppStoreAuthConfig({
      APPSTORE_AUTH_ENABLED: 'true', APPSTORE_SHARED_SECRET: 'test-shared-secret',
      APPSTORE_AUDIENCE: 'custom-audience', APPSTORE_ALLOWED_CLOCK_SKEW_SECONDS: '999',
      APPSTORE_MAX_TOKEN_TTL_SECONDS: '1', APPSTORE_SESSION_MAX_AGE_SECONDS: '999999',
      APPSTORE_COOKIE_SAMESITE: 'none', APPSTORE_COOKIE_SECURE: 'false', APPSTORE_COOKIE_DOMAIN: 'example.com',
    })).toEqual({
      enabled: true, sharedSecret: 'test-shared-secret', audience: 'custom-audience',
      allowedClockSkewSeconds: 120, maxTokenTtlSeconds: 30, sessionMaxAgeSeconds: 86400,
      cookieSameSite: 'none', cookieSecure: true, cookieDomain: 'example.com',
    });
  });

  it('fails closed for invalid production auth configuration', () => {
    expect(() => getAppStoreAuthConfig({
      NODE_ENV: 'production', APPSTORE_AUTH_ENABLED: 'false', APPSTORE_SHARED_SECRET: 'test-shared-secret',
    })).toThrowError(/auth configuration/i);
    expect(() => getAppStoreAuthConfig({
      NODE_ENV: 'production', APPSTORE_AUTH_ENABLED: 'true', APPSTORE_SHARED_SECRET: '',
    })).toThrowError(/auth configuration/i);
  });
});
