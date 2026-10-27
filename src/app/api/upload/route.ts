import { NextResponse } from 'next/server';
import path from 'path';
import { getAppConfig } from '@/lib/env';
import { parseDocument, DocumentParseError } from '@/lib/parsers/document-parser';
import { defineRoute, PublicError } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ALLOWED_EXTENSIONS = ['.docx', '.pdf', '.txt', '.md'];

export const POST = defineRoute({
  name: 'upload',
  noStore: true,
  parse: 'form',
  failureMessage: 'Failed to process the upload. Please try again.',
  maxBodyBytes: () => getAppConfig().maxFileSizeMb * 1024 * 1024 * 2,
  handler: async ({ form }) => {
    const file = form.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'No file provided in field "file".' },
        { status: 400 }
      );
    }

    const fileName = file instanceof File ? file.name : 'uploaded-file';
    const ext = path.extname(fileName).toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        {
          error: `Unsupported file type: "${ext}". Allowed types: .docx, .pdf, .txt, .md`,
        },
        { status: 400 }
      );
    }

    const maxBytes = getAppConfig().maxFileSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json(
        {
          error: `File size exceeds maximum allowed limit of ${getAppConfig().maxFileSizeMb}MB.`,
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let parsedText: string;
    try {
      parsedText = await parseDocument(buffer, fileName);
    } catch (parseError) {
      if (parseError instanceof DocumentParseError) throw new PublicError(parseError.message, parseError.status);
      console.error('[upload]', parseError);
      throw new PublicError('The document could not be read. Check that it is a valid .docx, .pdf, .txt or .md file.', 422);
    }

    return NextResponse.json(
      {
        text: parsedText,
        fileName,
        fileType: ext.replace('.', ''),
        characterCount: parsedText.length,
      },
      { status: 200 }
    );
  },
});
