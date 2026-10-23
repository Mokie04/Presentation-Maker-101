// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDeckExport } from '@/lib/export/use-deck-export';
import { downloadBlob } from '@/lib/export/client';
import type { PresentationData } from '@/types/presentation';

vi.mock('@/lib/export/compress-image', () => ({ compressImageForExport: vi.fn(async (value: string) => `${value}-small`) }));
vi.mock('@/lib/export/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/export/client')>()),
  downloadBlob: vi.fn(),
}));

const presentationData: PresentationData = {
  subject: 'Science', originalWriters: 'Teacher', topic: 'Water Cycle',
  slides: [{ slideNumber: 1, part: 'Discussion', title: 'Rain', contentPoints: ['P'], visualDescription: 'V' }],
};
let fetchMock: ReturnType<typeof vi.fn>;
const onError = vi.fn();

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  onError.mockClear();
  vi.mocked(downloadBlob).mockClear();
});
afterEach(() => { vi.unstubAllGlobals(); });

function setup(data: PresentationData | null = presentationData) {
  return renderHook(() => useDeckExport({ presentationData: data, slideImages: { 0: '/9j/rain' }, session: 'Session 1', onError }));
}

describe('downloadPptx', () => {
  it('posts the compressed payload, downloads the file and toggles the flag', async () => {
    let finish!: (res: Pick<Response, 'ok' | 'blob'>) => void;
    fetchMock.mockReturnValueOnce(new Promise<Pick<Response, 'ok' | 'blob'>>((resolve) => { finish = resolve; }));
    const { result } = setup();
    let done!: Promise<void>;
    act(() => { done = result.current.downloadPptx(); });
    expect(result.current.isDownloadingPptx).toBe(true);
    await act(async () => { await Promise.resolve(); });
    await act(async () => { finish({ ok: true, blob: async () => new Blob(['pptx']) }); await done; });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/download-pptx');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body)).toEqual({ presentationData, slideImages: { 0: '/9j/rain-small' }, session: 'Session 1' });
    expect(downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'water_cycle_session_1_SayunaAI.pptx');
    expect(result.current.isDownloadingPptx).toBe(false);
    expect(onError).not.toHaveBeenCalled();
  });

  it('reports the route error text', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ error: 'Invalid request: slideImages.0: bad' }, { status: 400 }));
    const { result } = setup();
    await act(async () => { await result.current.downloadPptx(); });
    expect(onError).toHaveBeenCalledWith('Invalid request: slideImages.0: bad');
    expect(downloadBlob).not.toHaveBeenCalled();
  });

  it('explains an interrupted connection', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const { result } = setup();
    await act(async () => { await result.current.downloadPptx(); });
    expect(onError).toHaveBeenCalledWith(
      'Network connection interrupted during download. Please try downloading again or use the Markdown outline.');
    expect(result.current.isDownloadingPptx).toBe(false);
  });

  it('falls back to the generic PPTX message for an error without text', async () => {
    fetchMock.mockRejectedValueOnce(new Error(''));
    const { result } = setup();
    await act(async () => { await result.current.downloadPptx(); });
    expect(onError).toHaveBeenCalledWith('Error generating PPTX file.');
  });
});

describe('downloadMarkdown', () => {
  it('posts the deck and saves under the Content-Disposition filename', async () => {
    fetchMock.mockResolvedValueOnce(new Response('# Outline', { headers: { 'Content-Disposition': 'attachment; filename="server_name_Outline.md"' } }));
    const { result } = setup();
    await act(async () => { await result.current.downloadMarkdown(); });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/download-markdown');
    expect(JSON.parse(init.body)).toEqual({ presentationData, session: 'Session 1' });
    expect(downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'server_name_Outline.md');
    const blob = vi.mocked(downloadBlob).mock.calls[0][0];
    expect(blob.type).toBe('text/markdown;charset=utf-8');
    expect(await blob.text()).toBe('# Outline');
    expect(result.current.isDownloadingMarkdown).toBe(false);
  });

  it('falls back to the export filename without Content-Disposition', async () => {
    fetchMock.mockResolvedValueOnce(new Response('# Outline'));
    const { result } = setup();
    await act(async () => { await result.current.downloadMarkdown(); });
    expect(downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'water_cycle_session_1_Outline.md');
  });

  it('reports the route error text', async () => {
    fetchMock.mockResolvedValueOnce(new Response('upstream exploded', { status: 500 }));
    const { result } = setup();
    await act(async () => { await result.current.downloadMarkdown(); });
    expect(onError).toHaveBeenCalledWith('upstream exploded');
  });
});

describe('without a presentation', () => {
  it('does nothing', async () => {
    const { result } = setup(null);
    await act(async () => {
      await result.current.downloadPptx();
      await result.current.downloadMarkdown();
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(result.current.isDownloadingPptx).toBe(false);
  });
});
