import { describe, expect, it } from 'vitest';
import {
  FAILED_IMAGE,
  hasWireImageFormat,
  isUsableImage,
  MAX_SLIDE_IMAGE_CHARS,
  sniffImageMime,
  toDataUrl,
  toRawBase64,
} from '@/lib/slide-image';

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const JPG = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP8=';

describe('FAILED_IMAGE', () => {
  it('is the wire value for a failed image', () => {
    expect(FAILED_IMAGE).toBe('failed');
  });
});

describe('isUsableImage', () => {
  it.each([
    [undefined, false], ['', false], ['failed', false],
    [PNG, true], [JPG, true], [`data:image/png;base64,${PNG}`, true],
  ])('%j is usable: %j', (value, usable) => {
    expect(isUsableImage(value)).toBe(usable);
  });
});

describe('toRawBase64', () => {
  it.each([
    [PNG, PNG], [JPG, JPG],
    [`data:image/png;base64,${PNG}`, PNG],
    [`data:image/jpeg;base64,${JPG}`, JPG],
    [`data:image/webp;base64,${PNG}`, PNG],
    ['', ''],
  ])('strips the prefix of %j', (value, raw) => {
    expect(toRawBase64(value)).toBe(raw);
  });
});

describe('sniffImageMime', () => {
  it.each([[JPG, 'image/jpeg'], [PNG, 'image/png'], ['', 'image/png'], ['R0lGOD', 'image/png']])('sniffs %j as %j', (raw, mime) => {
    expect(sniffImageMime(raw)).toBe(mime);
  });
});

describe('toDataUrl', () => {
  it.each([
    [PNG, `data:image/png;base64,${PNG}`],
    [JPG, `data:image/jpeg;base64,${JPG}`],
    [`data:image/png;base64,${PNG}`, `data:image/png;base64,${PNG}`],
    [`data:image/jpeg;base64,${JPG}`, `data:image/jpeg;base64,${JPG}`],
  ])('renders %j', (value, url) => {
    expect(toDataUrl(value)).toBe(url);
  });
});

describe('wire image validation', () => {
  it.each([
    ['empty', ''], ['failed', 'failed'], ['raw PNG', PNG], ['raw JPEG', JPG],
    ['PNG data URL', `data:image/png;base64,${PNG}`], ['JPEG data URL', `data:image/jpeg;base64,${JPG}`],
    ['the largest allowed image', `/9j/${'A'.repeat(MAX_SLIDE_IMAGE_CHARS - 4)}`],
  ])('accepts %s', (_, value) => {
    expect(hasWireImageFormat(value)).toBe(true);
  });

  it.each([
    ['text that is not base64', 'iVBORw0KGgo<script>alert(1)</script>'],
    ['base64 without an image signature', 'SGVsbG8gd29ybGQ='],
    ['a data URL of another type', `data:image/gif;base64,${PNG}`],
    ['a non-image data URL', `data:text/plain;base64,${PNG}`],
  ])('rejects %s', (_, value) => {
    expect(hasWireImageFormat(value)).toBe(false);
  });

  it('leaves the length limit to the caller: the format alone accepts an oversized image', () => {
    expect(hasWireImageFormat(`/9j/${'A'.repeat(MAX_SLIDE_IMAGE_CHARS)}`)).toBe(true);
    expect(MAX_SLIDE_IMAGE_CHARS).toBe(1_500_000);
  });
});
