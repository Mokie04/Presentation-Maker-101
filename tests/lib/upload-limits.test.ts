import { describe, expect, it } from 'vitest';
import { DEFAULT_MAX_UPLOAD_MB, uploadTooLargeMessage } from '@/lib/upload-limits';

describe('upload limits', () => {
  it('defaults to 4 MB, under the platform request-body limit', () => {
    expect(DEFAULT_MAX_UPLOAD_MB).toBe(4);
  });

  it.each([
    [5 * 1024 * 1024, 'That file is 5.0 MB; the limit is 4 MB. Try a smaller file or paste the lesson text instead.'],
    [6.26 * 1024 * 1024, 'That file is 6.3 MB; the limit is 4 MB. Try a smaller file or paste the lesson text instead.'],
    [4 * 1024 * 1024 + 1, 'That file is 4.0 MB; the limit is 4 MB. Try a smaller file or paste the lesson text instead.'],
  ])('states the size of a %i-byte file to one decimal', (size, message) => {
    expect(uploadTooLargeMessage(size)).toBe(message);
  });

  it('omits the size when it is unknown', () => {
    expect(uploadTooLargeMessage()).toBe('That file is too large; the limit is 4 MB. Try a smaller file or paste the lesson text instead.');
  });
});
