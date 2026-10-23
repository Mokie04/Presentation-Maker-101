import { PublicError } from '@/lib/api';
import { NasaProviderError } from '@/lib/providers/nasa-provider';

export function rethrowNasaError(error: unknown): never {
  if (error instanceof NasaProviderError) throw new PublicError(error.message, error.status);
  throw error;
}
