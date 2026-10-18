import type { NextRequest } from 'next/server';

export class BodyTooLargeError extends Error {}

/** Reads the body as text, stopping as soon as it exceeds `limit` bytes, declared or streamed. */
export async function readBodyText(request: NextRequest, limit: number): Promise<string> {
  if (Number(request.headers.get('content-length')) > limit) throw new BodyTooLargeError();
  const reader = request.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new BodyTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks).toString('utf8');
}
