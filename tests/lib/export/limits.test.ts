import { describe, expect, it } from 'vitest';
import { CLIENT_EXPORT_BUDGET_CHARS, MAX_EXPORT_BODY_BYTES } from '@/lib/export/limits';

describe('export limits', () => {
  it('keeps the client budget below the server body cap', () => {
    expect(CLIENT_EXPORT_BUDGET_CHARS).toBe(3.5 * 1024 * 1024);
    expect(MAX_EXPORT_BODY_BYTES).toBe(4_500_000);
    expect(CLIENT_EXPORT_BUDGET_CHARS).toBeLessThan(MAX_EXPORT_BODY_BYTES);
  });
});
