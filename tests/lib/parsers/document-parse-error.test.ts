import { expect, it } from 'vitest';
import { parseDocument } from '@/lib/parsers/document-parser';

it.each([
  { content: '', name: 'empty.txt', message: 'File is empty: empty.txt' },
  { content: ' \n\t ', name: 'blank.md', message: 'Document contains no text content: blank.md' },
  { content: 'content', name: 'image.png', message: 'Unsupported file type: ".png". Supported types are .docx, .pdf, .txt, .md' },
])('marks the authored $name error as safe for the upload response', async ({ content, name, message }) => {
  await expect(parseDocument(Buffer.from(content), name)).rejects.toMatchObject({ name: 'DocumentParseError', message });
});
