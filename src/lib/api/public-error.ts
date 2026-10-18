/** An error whose message is safe to show the client; anything else becomes the route's generic failure message. */
export class PublicError extends Error {
  readonly status: number;
  readonly extra?: Record<string, unknown>;
  readonly headers?: Record<string, string>;

  constructor(
    message: string,
    status: number,
    options: { extra?: Record<string, unknown>; headers?: Record<string, string> } = {}
  ) {
    super(message);
    this.name = 'PublicError';
    this.status = status;
    this.extra = options.extra;
    this.headers = options.headers;
  }
}
