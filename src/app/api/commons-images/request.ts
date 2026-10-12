import type { NextRequest } from 'next/server';
export class CommonsInputSizeError extends Error {}
/** Picker requests contain only a short query or numeric file ID. Bound ignored fields too. */
export async function readCommonsInput(request: NextRequest): Promise<unknown> {
  const limit = 8192;
  if (Number(request.headers.get('content-length')) > limit) throw new CommonsInputSizeError();
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing request body');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new CommonsInputSizeError(); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
