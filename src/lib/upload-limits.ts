/**
 * Default upload limit in MiB, shared by the server config and the browser.
 * Vercel Functions reject request bodies above about 4.5 MB (multipart overhead included)
 * before the route runs, so 4 MiB leaves headroom.
 */
export const DEFAULT_MAX_UPLOAD_MB = 4;

const SUGGESTION = 'Try a smaller file or paste the lesson text instead.';

/** Teacher-facing text for a file over the limit; the size is stated when known. */
export function uploadTooLargeMessage(sizeBytes?: number): string {
  const limit = `the limit is ${DEFAULT_MAX_UPLOAD_MB} MB.`;
  return sizeBytes === undefined
    ? `That file is too large; ${limit} ${SUGGESTION}`
    : `That file is ${(sizeBytes / 1024 / 1024).toFixed(1)} MB; ${limit} ${SUGGESTION}`;
}
