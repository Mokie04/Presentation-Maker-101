/** Abort check for browsers/WebViews that do not implement AbortSignal.throwIfAborted. */
export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError');
}
