import JSZip from 'jszip';

export async function docxBuffer(text: string): Promise<Buffer> {
  const archive = new JSZip();
  archive.file('word/document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>' + text + '</w:t></w:r></w:p></w:body></w:document>');
  return archive.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

export function pdfBuffer(pages = 1, text = 'Hello lesson'): Buffer {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Count ' + pages + ' /Kids [' + Array.from({ length: pages }, (_, i) => (i + 3) + ' 0 R').join(' ') + '] >>',
  ];
  const contentId = pages + 3;
  const fontId = pages + 4;
  for (let i = 0; i < pages; i++) {
    objects.push(text
      ? `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`
      : '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> >>');
  }
  const content = `BT /F1 12 Tf 50 700 Td (${text}) Tj ET`;
  if (text) {
    objects.push(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`);
    objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  }
  // pdf.js 1.10 mishandles pooled tiny Buffers; keep this realistic fixture above 4 KiB.
  let pdf = '%PDF-1.4\n%' + 'fixture padding '.repeat(400) + '\n';
  const offsets: number[] = [];
  let length = Buffer.byteLength(pdf);
  for (let i = 0; i < objects.length; i++) {
    offsets.push(length);
    const object = `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
    pdf += object;
    length += Buffer.byteLength(object);
  }
  const xref = length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}

/** Falsify non-empty central/local size declarations without changing deflate bytes. */
export function falsifyDocxSizes(buffer: Buffer, size = 1): Buffer {
  const falsified = Buffer.from(buffer);
  for (let offset = 0; offset + 46 <= falsified.length; offset++) {
    const signature = falsified.readUInt32LE(offset);
    if (signature === 0x02014b50 && falsified.readUInt32LE(offset + 24) > 0) falsified.writeUInt32LE(size, offset + 24);
    if (signature === 0x04034b50 && falsified.readUInt32LE(offset + 22) > 0) falsified.writeUInt32LE(size, offset + 22);
  }
  return falsified;
}
