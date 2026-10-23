import type { NextRequest } from 'next/server';

export class BodyTooLargeError extends Error {}

/** Reads bytes once, stopping as soon as the declared or streamed body exceeds `limit`. */
async function readBodyBytes(request: NextRequest, limit: number): Promise<Buffer> {
  if (Number(request.headers.get('content-length')) > limit) throw new BodyTooLargeError();
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
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
  return Buffer.concat(chunks);
}

export async function readBodyText(request: NextRequest, limit: number): Promise<string> {
  return (await readBodyBytes(request, limit)).toString('utf8');
}

export async function readBodyForm(request: NextRequest, limit: number): Promise<FormData> {
  const bytes = await readBodyBytes(request, limit);
  return new Response(new Uint8Array(bytes), {
    headers: { 'Content-Type': request.headers.get('content-type') ?? '' },
  }).formData();
}
