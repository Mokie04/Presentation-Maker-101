// @vitest-environment jsdom
import React, { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { UploadSection } from '@/components/UploadSection';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
function pendingUpload(stage: 'fetch' | 'body', text: string, fileName: string) {
  const fetch = deferred<Response>();
  const body = deferred<string>();
  const response = new Response();
  vi.spyOn(response, 'text').mockImplementation(() => body.promise);
  return {
    request: () => stage === 'fetch' ? fetch.promise : Promise.resolve(response),
    finish: async () => { await act(async () => {
      if (stage === 'fetch') fetch.resolve(Response.json({ text, fileName }));
      else body.resolve(JSON.stringify({ text, fileName }));
    }); },
    fail: async () => { await act(async () => {
      if (stage === 'fetch') fetch.reject(new Error('Older upload failed'));
      else body.reject(new Error('Older upload failed'));
    }); },
  };
}
function setup(initialText = '', initialName = '') {
  const fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', fetchMock);
  const generate = vi.fn();
  const success = vi.fn();
  function ControlledUpload() {
    const [text, setText] = useState(initialText);
    const [name, setName] = useState(initialName);
    return <><output aria-label="Current lesson">{text}</output><output aria-label="Current file">{name}</output>
      <UploadSection extractedText={text} fileName={name} onUploadSuccess={(value, fileName) => {
        success(value, fileName); setText(value); setName(fileName);
      }} selectedSession="Session 1" onSessionChange={vi.fn()} onGenerate={generate} isLoading={false} loadingStage="" /></>;
  }
  const view = render(<ControlledUpload />);
  const input = () => view.container.querySelector<HTMLInputElement>('input[type="file"]')!;
  const choose = async (name: string) => { await act(async () => {
    fireEvent.change(input(), { target: { files: [new File(['lesson'], name)] } });
  }); };
  const busy = () => screen.getByRole('button', { name: 'Choose lesson plan document' }).parentElement!.getAttribute('aria-busy');
  return { ...view, fetchMock, input, choose, busy, generate, success };
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it.each(['fetch', 'body'] as const)('keeps the newer upload when the older %s completes last', async stage => {
  const { fetchMock, choose, busy, generate } = setup();
  const older = pendingUpload(stage, 'Older lesson', 'older.txt');
  const newer = pendingUpload(stage, 'Newer lesson', 'newer.txt');
  fetchMock.mockImplementationOnce(older.request).mockImplementationOnce(newer.request);
  await choose('older.txt'); await choose('newer.txt');
  expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
  expect(fetchMock.mock.calls[1][1]?.signal?.aborted).toBe(false);
  await newer.finish(); await older.finish();
  expect(screen.getByLabelText('Current lesson').textContent).toBe('Newer lesson');
  expect(screen.getByLabelText('Current file').textContent).toBe('newer.txt');
  expect(busy()).toBe('false');
  fireEvent.click(screen.getByRole('button', { name: 'Generate Slides' }));
  expect(generate).toHaveBeenCalledWith('Newer lesson', 'Session 1');
});
it.each(['fetch', 'body'] as const)('keeps the newer upload busy when the older %s completes first', async stage => {
  const { fetchMock, choose, busy } = setup();
  const older = pendingUpload(stage, 'Older lesson', 'older.txt');
  const newer = pendingUpload(stage, 'Newer lesson', 'newer.txt');
  fetchMock.mockImplementationOnce(older.request).mockImplementationOnce(newer.request);
  await choose('older.txt'); await choose('newer.txt');
  await older.finish();
  expect(screen.getByLabelText('Current lesson').textContent).toBe('');
  expect(busy()).toBe('true');
  expect((screen.getByRole('button', { name: 'Generate Slides' }) as HTMLButtonElement).disabled).toBe(true);
  await newer.finish();
  expect(screen.getByLabelText('Current lesson').textContent).toBe('Newer lesson');
  expect(busy()).toBe('false');
});
it.each(['fetch', 'body'] as const)('ignores an older %s failure without clearing the newer busy state', async stage => {
  const { fetchMock, choose, busy } = setup();
  const older = pendingUpload(stage, 'Older lesson', 'older.txt');
  const newer = pendingUpload(stage, 'Newer lesson', 'newer.txt');
  fetchMock.mockImplementationOnce(older.request).mockImplementationOnce(newer.request);
  await choose('older.txt'); await choose('newer.txt'); await older.fail();
  expect(screen.queryByRole('alert')).toBeNull();
  expect(busy()).toBe('true');
  await newer.finish();
  expect(screen.getByLabelText('Current lesson').textContent).toBe('Newer lesson');
});
it.each(['fetch', 'body'] as const)('keeps pasted text when an older upload %s completes', async stage => {
  const { fetchMock, choose, generate } = setup();
  const older = pendingUpload(stage, 'Older lesson', 'older.txt');
  fetchMock.mockImplementationOnce(older.request);
  await choose('older.txt');
  const signal = fetchMock.mock.calls[0][1]?.signal;
  fireEvent.click(screen.getByRole('button', { name: 'Paste Lesson Plan Text' }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Teacher paste' } });
  await older.finish();
  expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Teacher paste');
  expect(screen.getByLabelText('Current lesson').textContent).toBe('Teacher paste');
  expect(screen.getByLabelText('Current file').textContent).toBe('');
  expect(signal?.aborted).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Generate Slides' }));
  expect(generate).toHaveBeenCalledWith('Teacher paste', 'Session 1');
});
it('clears prior paste on valid file selection and displays the extracted text when paste is opened', async () => {
  const { fetchMock, choose } = setup('Prior paste');
  const incoming = pendingUpload('body', 'Uploaded lesson', 'lesson.txt');
  fetchMock.mockImplementationOnce(incoming.request);
  await choose('lesson.txt');
  expect(screen.getByLabelText('Current lesson').textContent).toBe('');
  fireEvent.click(screen.getByRole('button', { name: 'Paste Lesson Plan Text' }));
  expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('');
  await incoming.finish();
  expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Uploaded lesson');
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Edited upload' } });
  expect(screen.getByLabelText('Current file').textContent).toBe('');
  expect(screen.queryByText('lesson.txt')).toBeNull();
});
it('preserves existing teacher text when an oversized file is rejected', () => {
  const { input, fetchMock } = setup('Teacher text', 'original.txt');
  const file = new File(['x'], 'too-large.pdf');
  Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024 });
  fireEvent.change(input(), { target: { files: [file] } });
  expect(screen.getByRole('alert').textContent).toContain('That file is 5.0 MB; the limit is 4 MB.');
  expect(screen.getByLabelText('Current lesson').textContent).toBe('Teacher text');
  expect(screen.getByLabelText('Current file').textContent).toBe('original.txt');
  expect(fetchMock).not.toHaveBeenCalled();
});
it.each([
  ['a server rejection', () => Promise.resolve(Response.json({ error: 'The document could not be read.' }, { status: 422 })), 'The document could not be read.'],
  ['a network failure', () => Promise.reject(new Error('Network down')), 'Network down'],
])('restores the previous lesson after %s', async (_case, response, message) => {
  const { fetchMock, choose, busy } = setup('Teacher text', 'original.txt');
  fetchMock.mockImplementationOnce(response);
  await choose('broken.pdf');
  expect(screen.getByRole('alert').textContent).toBe(message);
  expect(screen.getByLabelText('Current lesson').textContent).toBe('Teacher text');
  expect(screen.getByLabelText('Current file').textContent).toBe('original.txt');
  expect(busy()).toBe('false');
});
it('restores the lesson from before the first of two failed uploads', async () => {
  const { fetchMock, choose } = setup('Teacher text', 'original.txt');
  const older = pendingUpload('fetch', 'Older lesson', 'older.txt');
  fetchMock.mockImplementationOnce(older.request)
    .mockImplementationOnce(() => Promise.resolve(Response.json({ error: 'Unreadable.' }, { status: 422 })));
  await choose('older.txt'); await choose('newer.pdf');
  expect(screen.getByLabelText('Current lesson').textContent).toBe('Teacher text');
  expect(screen.getByLabelText('Current file').textContent).toBe('original.txt');
});
it('resets the file input synchronously and permits selecting the same file after failure', async () => {
  const { input, fetchMock } = setup();
  const pending = deferred<Response>();
  fetchMock.mockImplementationOnce(() => pending.promise).mockResolvedValueOnce(Response.json({ text: 'Retried lesson', fileName: 'lesson.txt' }));
  const file = new File(['lesson'], 'lesson.txt');
  Object.defineProperty(input(), 'value', { writable: true, configurable: true, value: 'C:\\fakepath\\lesson.txt' });
  fireEvent.change(input(), { target: { files: [file] } });
  expect(input().value).toBe('');
  await act(async () => { pending.reject(new Error('Temporary upload failure')); });
  expect(screen.getByRole('alert').textContent).toBe('Temporary upload failure');
  await act(async () => { fireEvent.change(input(), { target: { files: [file] } }); });
  expect(screen.getByLabelText('Current lesson').textContent).toBe('Retried lesson');
  expect(screen.queryByRole('alert')).toBeNull();
});
it.each(['fetch', 'body'] as const)('aborts on unmount and ignores late %s completion', async stage => {
  const { fetchMock, choose, unmount, success } = setup();
  const incoming = pendingUpload(stage, 'Late lesson', 'lesson.txt');
  fetchMock.mockImplementationOnce(incoming.request);
  await choose('lesson.txt');
  const signal = fetchMock.mock.calls[0][1]?.signal;
  success.mockClear(); unmount();
  expect(signal?.aborted).toBe(true);
  await incoming.finish();
  expect(success).not.toHaveBeenCalled();
});
