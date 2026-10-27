import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/upload/route';
import * as parser from '@/lib/parsers/document-parser';
import { LESSON_TOO_LONG_MESSAGE, MAX_LESSON_TEXT_LENGTH } from '@/lib/lesson-limits';

const unreadable = 'The document could not be read. Check that it is a valid .docx, .pdf, .txt or .md file.';
async function uploadRequest(content: BlobPart = 'Lesson', name = 'lesson.txt') {
  const form = new FormData();
  form.append('file', new File([content], name));
  const encoded = new Request('http://localhost/api/upload', { method: 'POST', body: form });
  // Network requests arrive as wire bytes, without Node's FormData encoder running during cancellation.
  return new NextRequest(encoded.url, { method: 'POST', headers: encoded.headers, body: await encoded.arrayBuffer() });
}

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe('upload body and parser error policy', () => {
  it.each(['declared', 'streamed'])('rejects %s bodies above twice the configured file limit', async (mode) => {
    vi.stubEnv('MAX_FILE_SIZE_MB', '1');
    const parse = vi.spyOn(parser, 'parseDocument');
    const request = await uploadRequest(new Uint8Array(2 * 1024 * 1024 + 1));
    if (mode === 'declared') request.headers.set('Content-Length', String(2 * 1024 * 1024 + 1));
    const response = await POST(request);
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: 'Request body exceeds the size limit.' });
    expect(parse).not.toHaveBeenCalled();
  });

  it('preserves the 400 message for a file between the limit and body ceiling', async () => {
    vi.stubEnv('MAX_FILE_SIZE_MB', '1');
    const response = await POST(await uploadRequest(new Uint8Array(1024 * 1024 + 1)));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'File size exceeds maximum allowed limit of 1MB.' });
  });

  it('preserves the invalid-form message', async () => {
    const response = await POST(new NextRequest('http://localhost/api/upload', { method: 'POST', body: 'not multipart' }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid form data payload.' });
  });

  it.each([
    { content: '', name: 'empty.txt', message: 'File is empty: empty.txt' },
    { content: ' \n\t ', name: 'blank.md', message: 'Document contains no text content: blank.md' },
  ])('returns the authored parser message for $name at 422', async ({ content, name, message }) => {
    const response = await POST(await uploadRequest(content, name));
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: message });
  });

  it('passes an authored unsupported-type parser error through at 422', async () => {
    const message = 'Unsupported file type: ".other". Supported types are .docx, .pdf, .txt, .md';
    vi.spyOn(parser, 'parseDocument').mockRejectedValue(new parser.DocumentParseError(message));
    const response = await POST(await uploadRequest());
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: message });
  });

  it('returns the shared product limit message at 400 for oversized lesson text', async () => {
    const response = await POST(await uploadRequest('x'.repeat(MAX_LESSON_TEXT_LENGTH + 1)));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: LESSON_TOO_LONG_MESSAGE });
  });

  it('logs internal parser errors and returns the fixed unreadable-file response', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('LEAK stack detail');
    vi.spyOn(parser, 'parseDocument').mockRejectedValue(error);
    const response = await POST(await uploadRequest('corrupt', 'lesson.pdf'));
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: unreadable });
    expect(log).toHaveBeenCalledWith('[upload]', error);
  });

  it('uses the fixed 500 for a failure outside document parsing', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const request = await uploadRequest();
    const error = new Error('LEAK buffer failure');
    vi.spyOn(File.prototype, 'arrayBuffer').mockRejectedValue(error);
    const parse = vi.spyOn(parser, 'parseDocument');
    const response = await POST(request);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Failed to process the upload. Please try again.' });
    expect(log).toHaveBeenCalledWith('[upload]', error);
    expect(parse).not.toHaveBeenCalled();
  });

  it('sanitizes invalid upload configuration as an unexpected 500', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv('MAX_FILE_SIZE_MB', 'invalid');
    const response = await POST(await uploadRequest());
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Failed to process the upload. Please try again.' });
  });
});
