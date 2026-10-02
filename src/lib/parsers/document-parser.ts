import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import path from 'path';

export async function parseDocument(buffer: Buffer, fileName: string): Promise<string> {
  if (!buffer || buffer.length === 0) {
    throw new Error(`File is empty: ${fileName}`);
  }

  const ext = path.extname(fileName).toLowerCase();
  let extractedText = '';

  switch (ext) {
    case '.docx': {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
      break;
    }
    case '.pdf': {
      const data = await pdfParse(buffer);
      extractedText = data.text;
      break;
    }
    case '.txt':
    case '.md': {
      extractedText = buffer.toString('utf-8');
      break;
    }
    default:
      throw new Error(
        `Unsupported file type: "${ext}". Supported types are .docx, .pdf, .txt, .md`
      );
  }

  if (!extractedText || extractedText.trim().length === 0) {
    throw new Error(`Document contains no text content: ${fileName}`);
  }

  return extractedText;
}
