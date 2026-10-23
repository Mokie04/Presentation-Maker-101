import { PublicError } from '@/lib/api';
import { CommonsProviderError } from '@/lib/providers/commons-provider';

export function rethrowCommonsError(error: unknown): never {
  if (error instanceof CommonsProviderError) {
    throw new PublicError(error.message, error.status, error.status === 429 ? {
      extra: { retryAfterSeconds: error.retryAfterSeconds },
      headers: { 'Retry-After': String(error.retryAfterSeconds) },
    } : {});
  }
  throw error;
}
