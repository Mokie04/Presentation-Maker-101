// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { UploadSection } from '@/components/UploadSection';

const MB = 1024 * 1024;
const friendly = (size: string) => `That file is ${size} MB; the limit is 4 MB. Try a smaller file or paste the lesson text instead.`;
const unknownSize = 'That file is too large; the limit is 4 MB. Try a smaller file or paste the lesson text instead.';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function fileOfSize(bytes: number, name = 'lesson.pdf') {
  const file = new File(['x'], name, { type: 'application/pdf' });
  Object.defineProperty(file, 'size', { value: bytes });
  return file;
}

function setup(response?: Response) {
  const fetchMock = vi.fn(async () => response ?? Response.json({ text: 'Parsed lesson', fileName: 'lesson.pdf' }));
  vi.stubGlobal('fetch', fetchMock);
  const onUploadSuccess = vi.fn();
  const { container } = render(<UploadSection extractedText="" fileName="" onUploadSuccess={onUploadSuccess} selectedSession=""
    onSessionChange={vi.fn()} onGenerate={vi.fn()} isLoading={false} loadingStage="" />);
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
  const choose = (file: File) => fireEvent.change(input, { target: { files: [file] } });
  const drop = (file: File) => fireEvent.drop(screen.getByRole('button', { name: 'Choose lesson plan document' }), { dataTransfer: { files: [file] } });
  return { fetchMock, onUploadSuccess, choose, drop };
}

describe('UploadSection size limit', () => {
  it('promises the 4MB limit in the dropzone copy', () => {
    setup();
    expect(screen.getByText(/up to 4MB\)/)).toBeTruthy();
    expect(screen.queryByText(/10MB/)).toBeNull();
  });

  it.each(['choose', 'drop'] as const)('refuses a 5 MB file before sending it (%s)', async (how) => {
    const { fetchMock, onUploadSuccess, ...actions } = setup();
    actions[how](fileOfSize(5 * MB));
    expect(await screen.findByText(friendly('5.0'))).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onUploadSuccess).not.toHaveBeenCalled();
  });

  it('uploads a file of exactly 4 MB', async () => {
    const { fetchMock, onUploadSuccess, choose } = setup();
    choose(fileOfSize(4 * MB));
    await waitFor(() => expect(onUploadSuccess).toHaveBeenCalledWith('Parsed lesson', 'lesson.pdf'));
    expect(fetchMock).toHaveBeenCalledWith('/api/upload', expect.objectContaining({ method: 'POST' }));
  });

  it.each([
    ['a non-JSON 413 from the platform', new Response('Request Entity Too Large\nFUNCTION_PAYLOAD_TOO_LARGE', { status: 413 })],
    ['a JSON 413 from the route', Response.json({ error: 'Request body exceeds the size limit.' }, { status: 413 })],
  ])('explains %s without the raw response text', async (_, response) => {
    const { choose } = setup(response);
    choose(fileOfSize(3 * MB));
    expect(await screen.findByText(unknownSize)).toBeTruthy();
    expect(screen.queryByText(/Entity|PAYLOAD|exceeds/)).toBeNull();
  });

  it.each([
    ['the first 150 characters of other non-JSON errors', new Response(`Bad gateway ${'x'.repeat(200)}`, { status: 502 }), `Bad gateway ${'x'.repeat(138)}`],
    ['the status for an empty non-JSON error', new Response('', { status: 500 }), 'Upload failed (500)'],
    ['the JSON error text', Response.json({ error: 'Unsupported file type: ".exe".' }, { status: 400 }), 'Unsupported file type: ".exe".'],
  ])('keeps showing %s', async (_, response, message) => {
    const { choose } = setup(response);
    choose(fileOfSize(1 * MB));
    expect(await screen.findByText(message)).toBeTruthy();
  });
});
