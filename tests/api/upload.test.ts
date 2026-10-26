import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/upload/route';
import { NextRequest } from 'next/server';

describe('POST /api/upload', () => {
  async function createMultipartRequest(file?: File | null): Promise<NextRequest> {
    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }
    // Encode once so this fixture has the same declared byte length as an HTTP upload.
    // Node 26's FormData producer can enqueue after an oversized stream is cancelled.
    const encoded = new Response(formData);
    const body = await encoded.arrayBuffer();
    return new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': encoded.headers.get('content-type')!, 'Content-Length': String(body.byteLength) },
      body,
    });
  }

  it('successfully uploads and parses a valid .txt file', async () => {
    const file = new File(['Hello Grade 4 students!'], 'lesson.txt', {
      type: 'text/plain',
    });
    const req = await createMultipartRequest(file);

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.text).toBe('Hello Grade 4 students!');
    expect(json.fileName).toBe('lesson.txt');
    expect(json.fileType).toBe('txt');
    expect(json.characterCount).toBe('Hello Grade 4 students!'.length);
  });

  it('returns 400 if no file is provided', async () => {
    const req = await createMultipartRequest(null);
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/No file provided/);
  });

  it('returns 400 if file has unsupported extension', async () => {
    const file = new File(['content'], 'test.exe', { type: 'application/octet-stream' });
    const req = await createMultipartRequest(file);
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Unsupported file type/);
  });

  it('returns 400 if file exceeds MAX_FILE_SIZE_MB', async () => {
    // Default 4MB limit; a 5MB file is over it but under the 8MB body ceiling (twice the limit).
    const largeBuffer = new Uint8Array(5 * 1024 * 1024);
    const file = new File([largeBuffer], 'large.txt', { type: 'text/plain' });
    const req = await createMultipartRequest(file);
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/File size exceeds/);
  });

  it('returns 413 if the request body exceeds twice MAX_FILE_SIZE_MB', async () => {
    // An 11MB file is over the 8MB body ceiling, so defineRoute rejects it before the handler runs.
    const file = new File([new Uint8Array(11 * 1024 * 1024)], 'huge.txt', { type: 'text/plain' });
    const res = await POST(await createMultipartRequest(file));

    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ error: 'Request body exceeds the size limit.' });
  });
});
