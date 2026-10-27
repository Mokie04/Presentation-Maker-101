import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import JSZip from 'jszip';
import path from 'path';
import { Readable } from 'node:stream';
import { createInflateRaw } from 'node:zlib';
import { LESSON_TOO_LONG_MESSAGE, MAX_LESSON_TEXT_LENGTH } from '@/lib/lesson-limits';

const MAX_DOCX_ENTRIES = 2_000;
const MAX_DOCX_ENTRY_BYTES = 10 * 1024 * 1024;
const MAX_DOCX_TOTAL_BYTES = 20 * 1024 * 1024;
const MAX_PDF_PAGES = 200;
const PDF_TOO_MANY_PAGES_MESSAGE = 'This PDF has too many pages. Upload 200 pages or fewer, or paste a smaller part of the lesson plan.';
const DOCX_TOO_LARGE_MESSAGE = 'This document is too large once unpacked. Save it again as a smaller file or paste the text.';

export class DocumentParseError extends Error {
  constructor(message: string, public readonly status = 422) {
    super(message);
    this.name = 'DocumentParseError';
  }
}

function docxLimitError(): DocumentParseError {
  return new DocumentParseError(DOCX_TOO_LARGE_MESSAGE, 400);
}

// Count central records before JSZip deduplicates names. Reject ZIP64/multidisk
// archives: a DOCX within these product limits never needs either representation.
function inspectCentralDirectory(buffer: Buffer): Array<{ content: Buffer; deflated: boolean; size: number }> {
  // JSZip selects the last EOCD signature, even if it occurs inside a comment.
  // Inspect that exact record or reject; searching backwards for another valid
  // extent could verify one archive while JSZip later inflates a different one.
  const end = buffer.lastIndexOf(Buffer.from('PK\x05\x06'));
  if (end < Math.max(0, buffer.length - 65_557) || end + 22 > buffer.length ||
      end + 22 + buffer.readUInt16LE(end + 20) !== buffer.length) {
    throw new Error('Invalid ZIP directory');
  }
  const count = buffer.readUInt16LE(end + 10);
  const size = buffer.readUInt32LE(end + 12);
  const start = buffer.readUInt32LE(end + 16);
  if (count > MAX_DOCX_ENTRIES || size === 0xffffffff || start === 0xffffffff) throw docxLimitError();
  if (buffer.readUInt16LE(end + 4) || buffer.readUInt16LE(end + 6) ||
      buffer.readUInt16LE(end + 8) !== count || start + size !== end) throw new Error('Unsupported ZIP directory');
  const records: Array<{ content: Buffer; deflated: boolean; size: number }> = [];
  let entries = 0;
  let declaredTotal = 0;
  let offset = start;
  while (offset < end) {
    if (offset + 46 > end || buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error('Invalid ZIP entry');
    const bytes = buffer.readUInt32LE(offset + 24);
    declaredTotal += bytes;
    if (++entries > MAX_DOCX_ENTRIES || bytes > MAX_DOCX_ENTRY_BYTES || declaredTotal > MAX_DOCX_TOTAL_BYTES) {
      throw docxLimitError();
    }
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const local = buffer.readUInt32LE(offset + 42);
    const method = buffer.readUInt16LE(offset + 10);
    if (local + 30 > start || buffer.readUInt32LE(local) !== 0x04034b50 || ![0, 8].includes(method)) {
      throw new Error('Unsupported ZIP entry');
    }
    const dataStart = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    if (dataStart + compressedSize > start) throw new Error('Invalid ZIP entry data');
    records.push({ content: buffer.subarray(dataStart, dataStart + compressedSize), deflated: method === 8, size: bytes });
    offset += 46 + buffer.readUInt16LE(offset + 28) + buffer.readUInt16LE(offset + 30) + buffer.readUInt16LE(offset + 32);
  }
  if (offset !== end || entries !== count) throw new Error('Invalid ZIP entry count');
  return records;
}

// Native zlib emits bounded chunks and honours backpressure. JSZip's pako stream
// can inflate an entire compressed input chunk synchronously after consumer pause.
async function boundedInflate(content: Buffer, deflated: boolean, limit: number): Promise<number> {
  let size = 0;
  const source = Readable.from([content]);
  const stream = deflated ? source.pipe(createInflateRaw({ chunkSize: 16 * 1024 })) : source;
  try {
    for await (const chunk of stream) {
      size += chunk.length;
      if (size > limit) throw docxLimitError();
    }
  } finally {
    stream.destroy();
    source.destroy();
  }
  return size;
}

async function boundedDocx(buffer: Buffer): Promise<Buffer> {
  const records = inspectCentralDirectory(buffer);
  let total = 0;
  for (const record of records) {
    const actual = await boundedInflate(record.content, record.deflated,
      Math.min(MAX_DOCX_ENTRY_BYTES, MAX_DOCX_TOTAL_BYTES - total));
    if (actual !== record.size) throw new Error('Invalid ZIP uncompressed size');
    total += actual;
  }
  // Inspect names with JSZip only after every raw entry (including declared-empty
  // files and directories) passed the native byte counter and size verification.
  const archive = await JSZip.loadAsync(buffer);
  const verified = new JSZip();
  for (const entry of Object.values(archive.files)) {
    if (entry.dir) verified.folder(entry.name);
    else verified.file(entry.name, await entry.async('nodebuffer'));
  }
  // JSZip's second read is safe now: every original deflate stream and declaration
  // was verified. Mammoth receives bounded STORE data, never the uploaded archive.
  return verified.generateAsync({ type: 'nodebuffer', compression: 'STORE' });
}

export async function parseDocument(buffer: Buffer, fileName: string): Promise<string> {
  if (!buffer || buffer.length === 0) {
    throw new DocumentParseError(`File is empty: ${fileName}`);
  }

  const ext = path.extname(fileName).toLowerCase();
  let extractedText = '';

  switch (ext) {
    case '.docx': {
      const result = await mammoth.extractRawText({ buffer: await boundedDocx(buffer) });
      extractedText = result.value;
      break;
    }
    case '.pdf': {
      // Compressed object streams may hide pages, so also cap rendering and reject
      // pdf.js's actual page count. This precheck intentionally errs conservatively.
      const pdfSource = buffer.toString('latin1');
      const pagePattern = /\/Type\s*\/Page(?!s)\b/g;
      let pages = 0;
      while (pagePattern.exec(pdfSource) !== null) {
        if (++pages > MAX_PDF_PAGES) {
          throw new DocumentParseError(PDF_TOO_MANY_PAGES_MESSAGE, 400);
        }
      }
      const data = await pdfParse(buffer, { max: MAX_PDF_PAGES });
      if (data.numpages > MAX_PDF_PAGES) {
        throw new DocumentParseError(PDF_TOO_MANY_PAGES_MESSAGE, 400);
      }
      extractedText = data.text;
      break;
    }
    case '.txt':
    case '.md': {
      extractedText = buffer.toString('utf-8');
      break;
    }
    default:
      throw new DocumentParseError(
        `Unsupported file type: "${ext}". Supported types are .docx, .pdf, .txt, .md`
      );
  }

  if (extractedText.length > MAX_LESSON_TEXT_LENGTH) {
    throw new DocumentParseError(LESSON_TOO_LONG_MESSAGE, 400);
  }
  if (!extractedText || extractedText.trim().length === 0) {
    throw new DocumentParseError(`Document contains no text content: ${fileName}`);
  }

  return extractedText;
}
