import { describe, it, expect, vi } from 'vitest';
import { parseDocument } from '@/lib/parsers/document-parser';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';

vi.mock('mammoth', () => ({
  default: {
    extractRawText: vi.fn(),
  },
}));

vi.mock('pdf-parse', () => ({
  default: vi.fn(),
}));

describe('parseDocument', () => {
  it('parses .txt file correctly', async () => {
    const content = 'Lesson 1: Introduction to Plants';
    const buffer = Buffer.from(content, 'utf-8');

    const result = await parseDocument(buffer, 'lesson.txt');
    expect(result).toBe(content);
  });

  it('parses .md file correctly', async () => {
    const content = '# Lesson Plan\n\n## Objectives\n- Learn Fractions';
    const buffer = Buffer.from(content, 'utf-8');

    const result = await parseDocument(buffer, 'curriculum.md');
    expect(result).toBe(content);
  });

  it('parses .docx file using mammoth', async () => {
    const buffer = Buffer.from('fake-docx-binary');
    vi.mocked(mammoth.extractRawText).mockResolvedValueOnce({
      value: 'Extracted text from docx',
      messages: [],
    });

    const result = await parseDocument(buffer, 'plan.docx');
    expect(result).toBe('Extracted text from docx');
    expect(mammoth.extractRawText).toHaveBeenCalledWith({ buffer });
  });

  it('parses .pdf file using pdf-parse', async () => {
    const buffer = Buffer.from('fake-pdf-binary');
    vi.mocked(pdfParse).mockResolvedValueOnce({
      text: 'Extracted text from pdf',
      numpages: 1,
      numrender: 1,
      info: {},
      metadata: null,
      version: '1.10.100',
    } as any);

    const result = await parseDocument(buffer, 'curriculum.pdf');
    expect(result).toBe('Extracted text from pdf');
    expect(pdfParse).toHaveBeenCalledWith(buffer);
  });

  it('throws an error for empty buffer before processing', async () => {
    const emptyBuffer = Buffer.from('');
    await expect(parseDocument(emptyBuffer, 'empty.txt')).rejects.toThrow(
      /File is empty/
    );
  });

  it('throws an error if extracted text is empty or whitespace only', async () => {
    const whitespaceBuffer = Buffer.from('    \n\t  ');
    await expect(parseDocument(whitespaceBuffer, 'empty.txt')).rejects.toThrow(
      /Document contains no text content/
    );
  });

  it('throws an error for unsupported file extensions', async () => {
    const buffer = Buffer.from('hello');
    await expect(parseDocument(buffer, 'image.png')).rejects.toThrow(
      /Unsupported file type/
    );
    await expect(parseDocument(buffer, 'presentation.pptx')).rejects.toThrow(
      /Unsupported file type/
    );
  });
});
