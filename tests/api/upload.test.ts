import { describe, it, expect, vi } from 'vitest';
import { POST } from '@/app/api/upload/route';
import { NextRequest } from 'next/server';

describe('POST /api/upload', () => {
  function createMultipartRequest(file?: File | null): NextRequest {
    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }
    return new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    });
  }

  it('successfully uploads and parses a valid .txt file', async () => {
    const file = new File(['Hello Grade 4 students!'], 'lesson.txt', {
      type: 'text/plain',
    });
    const req = createMultipartRequest(file);

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.text).toBe('Hello Grade 4 students!');
    expect(json.fileName).toBe('lesson.txt');
    expect(json.fileType).toBe('txt');
    expect(json.characterCount).toBe('Hello Grade 4 students!'.length);
  });

  it('returns 400 if no file is provided', async () => {
    const req = createMultipartRequest(null);
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/No file provided/);
  });

  it('returns 400 if file has unsupported extension', async () => {
    const file = new File(['content'], 'test.exe', { type: 'application/octet-stream' });
    const req = createMultipartRequest(file);
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Unsupported file type/);
  });

  it('returns 400 if file exceeds MAX_FILE_SIZE_MB', async () => {
    // 10MB limit in env config. Create a mock file larger than 10MB (11MB)
    const largeBuffer = new Uint8Array(11 * 1024 * 1024);
    const file = new File([largeBuffer], 'large.txt', { type: 'text/plain' });
    const req = createMultipartRequest(file);
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/File size exceeds/);
  });
});
