// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadBlob, readErrorMessage } from '@/lib/export/client';

afterEach(() => { vi.restoreAllMocks(); });

describe('readErrorMessage', () => {
  const fallback = 'Failed to download PowerPoint.';

  it.each([
    ['uses the JSON error', JSON.stringify({ error: 'Invalid request: slideImages.0: bad' }), 'Invalid request: slideImages.0: bad'],
    ['falls back for JSON without an error', JSON.stringify({ message: 'nope' }), fallback],
    ['falls back for an empty JSON error', JSON.stringify({ error: '' }), fallback],
    ['uses the first 150 characters of plain text', 'x'.repeat(200), 'x'.repeat(150)],
    ['uses short plain text as is', 'Gateway Timeout', 'Gateway Timeout'],
    ['falls back for an empty body', '', fallback],
    ['keeps the text of JSON null', 'null', 'null'],
  ])('%s', async (_, body, message) => {
    expect(await readErrorMessage(new Response(body, { status: 500 }), fallback)).toBe(message);
  });

  it('falls back when reading the body fails', async () => {
    const res = new Response('ignored', { status: 500 });
    vi.spyOn(res, 'text').mockRejectedValueOnce(new Error('stream broke'));
    expect(await readErrorMessage(res, fallback)).toBe(fallback);
  });

  it.each([
    [413, '<html>Request Entity Too Large</html>'],
    [500, 'Request failed: FUNCTION_PAYLOAD_TOO_LARGE'],
    [500, JSON.stringify({ error: { code: 'FUNCTION_PAYLOAD_TOO_LARGE' } })],
  ])('explains a platform payload error (%s) without exposing its body', async (status, body) => {
    const message = await readErrorMessage(new Response(body, { status }), fallback);
    expect(message).toMatch(/too large/i);
    expect(message).toMatch(/fewer pictures|remove.*pictures/i);
    expect(message).toMatch(/Markdown outline/);
    expect(message).not.toMatch(/FUNCTION_PAYLOAD_TOO_LARGE|<html>/);
  });
});

describe('downloadBlob', () => {
  it('clicks a temporary link for the blob, then removes it and revokes the URL', () => {
    const createObjectURL = vi.fn(() => 'blob:export');
    const revokeObjectURL = vi.fn();
    const original = { createObjectURL: URL.createObjectURL, revokeObjectURL: URL.revokeObjectURL };
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const clicked: { href: string; download: string; attached: boolean }[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push({ href: this.href, download: this.download, attached: document.body.contains(this) });
    });
    const blob = new Blob(['outline'], { type: 'text/markdown' });

    downloadBlob(blob, 'water_cycle_session_1_Outline.md');

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(clicked).toEqual([{ href: 'blob:export', download: 'water_cycle_session_1_Outline.md', attached: true }]);
    expect(document.querySelectorAll('a')).toHaveLength(0);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:export');
    Object.assign(URL, original);
  });
});
