/**
 * A Slide image on the wire (slideImages, batch responses): raw base64, a data URL,
 * '' for none, or FAILED_IMAGE when the provider gave no usable image.
 */
export const FAILED_IMAGE = 'failed';

/** One slide image in base64 characters; the client compresses to a 480px JPEG first. */
export const MAX_SLIDE_IMAGE_CHARS = 1_500_000;

const DATA_URL_PREFIX = /^data:image\/[a-z]+;base64,/;
/** Optional PNG/JPEG data URL prefix, a JPEG or PNG signature, then base64 only. */
const WIRE_IMAGE_PATTERN = /^(?:data:image\/(?:png|jpeg);base64,)?(?:\/9j\/|iVBORw0KGgo)[A-Za-z0-9+/]*={0,2}$/;

export function isUsableImage(value?: string): boolean {
  return Boolean(value && value !== FAILED_IMAGE);
}

export function toRawBase64(value: string): string {
  return value.replace(DATA_URL_PREFIX, '');
}

export function sniffImageMime(raw: string): 'image/jpeg' | 'image/png' {
  return raw.startsWith('/9j/') ? 'image/jpeg' : 'image/png';
}

export function toDataUrl(value: string): string {
  return value.startsWith('data:') ? value : `data:${sniffImageMime(value)};base64,${value}`;
}

/** '' and FAILED_IMAGE are what the client sends for slides without a usable image. */
export function hasWireImageFormat(value: string): boolean {
  return value === '' || value === FAILED_IMAGE || WIRE_IMAGE_PATTERN.test(value);
}

export function isValidWireImage(value: string): boolean {
  return value.length <= MAX_SLIDE_IMAGE_CHARS && hasWireImageFormat(value);
}
