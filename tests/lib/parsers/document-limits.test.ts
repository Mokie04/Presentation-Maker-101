import { afterEach, describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';
import { parseDocument } from '@/lib/parsers/document-parser';
import { LESSON_TOO_LONG_MESSAGE, MAX_LESSON_TEXT_LENGTH } from '@/lib/lesson-limits';
import { docxBuffer, falsifyDocxSizes, pdfBuffer } from '../../helpers/document-fixtures';

const MIB = 1024 * 1024;

afterEach(() => vi.restoreAllMocks());

describe('document resource limits (real parsers, in-memory fixtures)', () => {
  it.each([null, 1, 0])('rejects a highly compressed DOCX above the entry cap (falsified size: %s)', async (falsifiedSize) => {
    const original = await docxBuffer('lesson '.repeat(Math.ceil(11 * MIB / 7)));
    const buffer = falsifiedSize === null ? original : falsifyDocxSizes(original, falsifiedSize);
    expect(buffer.length).toBeLessThan(40_000);
    const started = performance.now();
    const heapBefore = process.memoryUsage().heapUsed;
    await expect(parseDocument(buffer, 'bomb.docx')).rejects.toMatchObject({
      name: 'DocumentParseError', status: 400, message: expect.stringContaining('too large once unpacked'),
    });
    const elapsedMs = performance.now() - started;
    const heapGrowth = process.memoryUsage().heapUsed - heapBefore;
    console.info(JSON.stringify({ case: falsifiedSize === null ? 'docx-bomb' : `docx-lying-header-${falsifiedSize}`, bytes: buffer.length, elapsedMs, heapGrowth }));
    expect(elapsedMs).toBeLessThan(2_000);
    expect(heapGrowth).toBeLessThan(32 * MIB);
  });

  it('rejects ambiguous ZIP directories before JSZip can inflate an unverified archive', async () => {
    const safe = new JSZip();
    safe.file('safe.txt', 'safe');
    const outer = await safe.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    const hidden = await docxBuffer('x'.repeat(11 * MIB));
    const hiddenEnd = hidden.length - 22;
    const directory = hidden.readUInt32LE(hiddenEnd + 16);
    // Point the hidden directory at its own local entries in the combined buffer.
    for (let offset = directory; offset < hiddenEnd;
      offset += 46 + hidden.readUInt16LE(offset + 28) + hidden.readUInt16LE(offset + 30) + hidden.readUInt16LE(offset + 32)) {
      hidden.writeUInt32LE(hidden.readUInt32LE(offset + 42) + outer.length, offset + 42);
    }
    hidden.writeUInt32LE(directory + outer.length, hiddenEnd + 16);
    // The outer EOCD owns the hidden ZIP as a valid comment. Its final EOCD leaves
    // one trailing byte: JSZip selects it even though its comment extent is invalid.
    outer.writeUInt16LE(hidden.length + 1, outer.length - 2);
    const buffer = Buffer.concat([outer, hidden, Buffer.from([0])]);
    expect(buffer.length).toBeLessThan(20_000);
    const load = vi.spyOn(JSZip, 'loadAsync');
    const started = performance.now();
    await expect(parseDocument(buffer, 'ambiguous.docx')).rejects.toThrow('Invalid ZIP directory');
    expect(load).not.toHaveBeenCalled();
    expect(performance.now() - started).toBeLessThan(500);
  });

  it('rejects summed declared uncompressed bytes above 20 MiB', async () => {
    const archive = new JSZip();
    for (let i = 0; i < 3; i++) archive.file(`file${i}.xml`, 'x'.repeat(8 * MIB));
    const original = await archive.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    await expect(parseDocument(original, 'large.docx')).rejects.toMatchObject({ status: 400 });
  });

  it('enforces the actual summed cap when every declared entry is small', async () => {
    // Each actual entry is under 10 MiB and the sum crosses 20 MiB. Matching small
    // declarations for earlier entries let the stream reach the aggregate limit.
    const archive = new JSZip();
    archive.file('first.xml', 'a'.repeat(8 * MIB));
    archive.file('second.xml', 'b'.repeat(8 * MIB));
    archive.file('third.xml', 'c'.repeat(8 * MIB));
    const buffer = await archive.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    // Only the last size lies; declared aggregate is 16 MiB + 1, actual is 24 MiB.
    for (let offset = 0; offset + 46 <= buffer.length; offset++) {
      if (buffer.readUInt32LE(offset) === 0x02014b50 && buffer.subarray(offset + 46, offset + 55).toString() === 'third.xml') buffer.writeUInt32LE(1, offset + 24);
    }
    await expect(parseDocument(buffer, 'large.docx')).rejects.toMatchObject({ status: 400 });
  });

  it('rejects more than 2,000 entries before extraction', async () => {
    const archive = new JSZip();
    for (let i = 0; i < 2_001; i++) archive.file(`entry${i}`, '');
    const buffer = await archive.generateAsync({ type: 'nodebuffer' });
    await expect(parseDocument(buffer, 'many.docx')).rejects.toMatchObject({ status: 400 });
  });

  it('rejects a 20,000-page PDF in well under a second', async () => {
    const buffer = pdfBuffer(20_000, '');
    const started = performance.now();
    const heapBefore = process.memoryUsage().heapUsed;
    await expect(parseDocument(buffer, 'pages.pdf')).rejects.toMatchObject({ status: 400, message: expect.stringContaining('200 pages') });
    const elapsedMs = performance.now() - started;
    console.info(JSON.stringify({ case: 'pdf-20000-pages', bytes: buffer.length, elapsedMs, heapGrowth: process.memoryUsage().heapUsed - heapBefore }));
    expect(elapsedMs).toBeLessThan(500);
  });

  it('parses a real DOCX after bounded archive reconstruction', async () => {
    expect(await parseDocument(await docxBuffer('Normal lesson text.'), 'lesson.docx')).toBe('Normal lesson text.\n\n');
  });

  it('preserves legitimate empty archive files and ZIP comments', async () => {
    const archive = await JSZip.loadAsync(await docxBuffer('Normal lesson text.'));
    archive.file('empty.xml', '');
    const buffer = await archive.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', comment: 'Teacher lesson archive' });
    expect(await parseDocument(buffer, 'lesson.docx')).toBe('Normal lesson text.\n\n');
  });

  it('parses a real PDF under the page cap', async () => {
    expect(await parseDocument(pdfBuffer(), 'lesson.pdf')).toContain('Hello lesson');
  });

  it.each(['txt', 'md', 'docx'])('accepts a legitimate large %s lesson under the product cap', async (extension) => {
    const text = 'Read the lesson and explain the evidence.\n'.repeat(5_000);
    const buffer = extension === 'docx' ? await docxBuffer(text) : Buffer.from(text);
    expect((await parseDocument(buffer, `lesson.${extension}`)).trim()).toBe(text.trim());
  });

  it.each(['txt', 'md', 'docx'])('rejects extracted %s text above the shared product cap', async (extension) => {
    const text = 'x'.repeat(MAX_LESSON_TEXT_LENGTH + 1);
    const buffer = extension === 'docx' ? await docxBuffer(text) : Buffer.from(text);
    await expect(parseDocument(buffer, `lesson.${extension}`)).rejects.toMatchObject({ status: 400, message: LESSON_TOO_LONG_MESSAGE });
  });
});
