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
  const fillRect = vi.fn();
  const getImageData = vi.fn();
  let context: { drawImage: typeof drawImage; fillRect: typeof fillRect; fillStyle: string; getImageData?: typeof getImageData } | null;

  beforeEach(() => {
    loads = true;
    size = { width: 960, height: 480 };
    context = { drawImage, fillRect, fillStyle: '', getImageData };
    drawImage.mockClear();
    fillRect.mockClear();
    getImageData.mockReset().mockReturnValue({ data: new Uint8ClampedArray([12, 34, 56, 255, 78, 90, 12, 255]) });
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

  it.each([0, 128, 254])('retains PNG when a scanned pixel has alpha %s', async (alpha) => {
    getImageData.mockReturnValue({ data: new Uint8ClampedArray([12, 34, 56, 255, 78, 90, 12, alpha]) });
    vi.mocked(HTMLCanvasElement.prototype.toDataURL).mockReturnValue('data:image/png;base64,iVBORw0KGgoCOMPRESSED');
    expect(await compressImageForExport('iVBORw0KGgoAAAA')).toBe('iVBORw0KGgoCOMPRESSED');
    expect(getImageData).toHaveBeenCalledWith(0, 0, 480, 240);
    expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalledWith('image/png');
    expect(fillRect).not.toHaveBeenCalled();
  });

  it.each(['unavailable', 'throws'])('redraws over white for JPEG when pixel reading %s', async (failure) => {
    if (failure === 'unavailable') delete context!.getImageData;
    else getImageData.mockImplementation(() => { throw new Error('Canvas read blocked'); });
    expect(await compressImageForExport('iVBORw0KGgoAAAA')).toBe('/9j/COMPRESSED');
    expect(context!.fillStyle).toBe('#fff');
    expect(fillRect).toHaveBeenCalledWith(0, 0, 480, 240);
    expect(drawImage).toHaveBeenCalledTimes(2);
    expect(drawImage.mock.invocationCallOrder[0]).toBeLessThan(fillRect.mock.invocationCallOrder[0]);
    expect(fillRect.mock.invocationCallOrder[0]).toBeLessThan(drawImage.mock.invocationCallOrder[1]);
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
