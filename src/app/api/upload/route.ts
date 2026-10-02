import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { env } from '@/lib/env';
import { parseDocument } from '@/lib/parsers/document-parser';
import { requireSession } from '@/lib/sessionAuth';

export const dynamic = 'force-dynamic';

const ALLOWED_EXTENSIONS = ['.docx', '.pdf', '.txt', '.md'];

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: 'Invalid form data payload.' },
        { status: 400 }
      );
    }

    const file = formData.get('file');

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

    const maxBytes = env.app.maxFileSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json(
        {
          error: `File size exceeds maximum allowed limit of ${env.app.maxFileSizeMb}MB.`,
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
      const message = parseError instanceof Error ? parseError.message : String(parseError);
      return NextResponse.json({ error: message }, { status: 500 });
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
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
