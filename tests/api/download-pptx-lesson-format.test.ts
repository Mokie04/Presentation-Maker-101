import { expect, it } from 'vitest';
import JSZip from 'jszip';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/download-pptx/route';

// Export once renamed parts to Standard names, which turned a 4A's "Activity" into "Activities".
it("keeps 4A's part names in the exported PowerPoint", async () => {
  const presentationData = { subject: 'Mathematics', originalWriters: 'Teacher', topic: 'Reports', lessonFormat: "4A's",
    slides: ['Title Page', 'Activity', 'Abstraction'].map((part, index) => ({
      slideNumber: index + 1, part, title: `${part} slide`, contentPoints: ['Point'], visualDescription: '' })) };
  const res = await POST(new NextRequest('http://localhost:3000/api/download-pptx', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ presentationData, session: 'Whole lesson' }),
  }));
  expect(res.status).toBe(200);
  const zip = await JSZip.loadAsync(Buffer.from(await res.arrayBuffer()));
  const slide2 = await zip.file('ppt/slides/slide2.xml')!.async('string');
  const slide3 = await zip.file('ppt/slides/slide3.xml')!.async('string');
  expect(slide2).toContain('>ACTIVITY<');
  expect(slide2).not.toContain('ACTIVITIES');
  expect(slide3).toContain('>ABSTRACTION<');
});
