import { beforeEach } from 'vitest';
import { resetConfigCache } from '@/lib/env';

process.env.APPSTORE_AUTH_ENABLED = 'false';

// Tests must declare their own feature settings, even when the parent shell has them.
for (const key of Object.keys(process.env)) {
  if (
    key.startsWith('TEXT_PROVIDER_') || key.startsWith('IMAGE_PROVIDER_') ||
    ['PEXELS_API_KEY', 'IMAGE_SOURCE', 'MAX_FILE_SIZE_MB'].includes(key)
  ) {
    delete process.env[key];
  }
}

beforeEach(() => { resetConfigCache(); });
