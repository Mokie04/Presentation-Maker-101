import { Buffer } from 'node:buffer';

export interface BoundedFetchOptions {
  limitBytes: number;
  timeoutMs: number;
  headers?: HeadersInit;
  fetchFn?: typeof fetch;
  errors: {
    timeout(): Error;
    tooLarge(): Error;
    http(response: Response): Error | Promise<Error>;
    serverSideOnly?(): Error;
  };
}

/** Server-only fetch with one deadline for headers and consumption. URL trust belongs to the caller. */
export async function boundedFetch<T>(
  url: string,
  options: BoundedFetchOptions,
  consume: (response: Response, read: () => Promise<Buffer>) => T | Promise<T>
): Promise<T> {
  if (typeof window !== 'undefined') {
    throw options.errors.serverSideOnly?.() ?? new Error('Bounded fetch is server-side only.');
  }
  const controller = new AbortController();
  let response: Response | undefined;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const cancelBody = async () => {
    if (reader) await reader.cancel();
    else await response?.body?.cancel();
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(options.errors.timeout());
      controller.abort();
      // The deadline error wins even if abort cleanup fails.
      void cancelBody().catch(() => {});
    }, options.timeoutMs);
  });
  const operation = (async () => {
    try {
      response = await (options.fetchFn ?? fetch)(url, {
        headers: options.headers, signal: controller.signal, redirect: 'error',
      });
      // An injected fetch may resolve even after the deadline has aborted it.
      controller.signal.throwIfAborted();
      if (!response.ok) throw await options.errors.http(response);
      const bodyResponse = response;
      return await consume(response, async () => {
        controller.signal.throwIfAborted();
        // Defer size validation until read(), preserving callers' header-validation order.
        if (Number(bodyResponse.headers.get('content-length')) > options.limitBytes) throw options.errors.tooLarge();
        if (!bodyResponse.body) return Buffer.alloc(0);
        reader = bodyResponse.body.getReader();
        const chunks: Buffer[] = [];
        let size = 0;
        try {
          while (true) {
            const { done, value } = await reader.read();
            controller.signal.throwIfAborted();
            if (done) break;
            size += value.byteLength;
            if (size > options.limitBytes) {
              await cancelBody();
              throw options.errors.tooLarge();
            }
            chunks.push(Buffer.from(value));
          }
          return Buffer.concat(chunks, size);
        } finally {
          reader.releaseLock();
          reader = undefined;
        }
      });
    } finally {
      await cancelBody();
    }
  })();
  try {
    return await Promise.race([operation, deadline]);
  } finally {
    clearTimeout(timer);
  }
}
