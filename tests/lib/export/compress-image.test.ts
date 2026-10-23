// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { compressImageForExport, fitWithin } from '@/lib/export/compress-image';

describe('fitWithin', () => {
  it.each([
    [[400, 300], [400, 300]],
    [[480, 480], [480, 480]],
    [[960, 480], [480, 240]],
    [[480, 960], [240, 480]],
    [[1000, 1000], [480, 480]],
    [[1024, 577], [480, 270]],
  ])('fits %j within 480 as %j', ([width, height], [w, h]) => {
    expect(fitWithin(width, height, 480)).toEqual({ width: w, height: h });
  });
});

describe('compressImageForExport', () => {
  let loads: boolean;
  let size: { width: number; height: number };
  const drawImage = vi.fn();
  let context: { drawImage: typeof drawImage } | null;

  beforeEach(() => {
    loads = true;
    size = { width: 960, height: 480 };
    context = { drawImage };
    drawImage.mockClear();
    vi.stubGlobal('Image', class {
      width = size.width;
      height = size.height;
      crossOrigin = '';
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_: string) { queueMicrotask(() => (loads ? this.onload?.() : this.onerror?.())); }
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => context as never);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,/9j/COMPRESSED');
  });

  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('draws at the fitted size and returns the raw JPEG base64', async () => {
    expect(await compressImageForExport('iVBORw0KGgoAAAA')).toBe('/9j/COMPRESSED');
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 480, 240);
    expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.65);
  });

  it.each([
    ['a load error', () => { loads = false; }],
    ['a missing canvas context', () => { context = null; }],
  ])('falls back on %s: original when small, empty when over 150000 characters', async (_, breakIt) => {
    breakIt();
    const small = `/9j/${'A'.repeat(1000)}`;
    const large = `/9j/${'A'.repeat(150_000)}`;
    expect(await compressImageForExport(small)).toBe(small);
    expect(await compressImageForExport(large)).toBe('');
  });

  it('returns empty and failed values unchanged', async () => {
    expect(await compressImageForExport('')).toBe('');
    expect(await compressImageForExport('failed')).toBe('failed');
  });
});
