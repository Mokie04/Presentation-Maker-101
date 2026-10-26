import { performance } from 'node:perf_hooks';
import { NextRequest } from 'next/server';
import { expect, it } from 'vitest';
import { POST as pptx } from '@/app/api/download-pptx/route';
import { POST as markdown } from '@/app/api/download-markdown/route';

it.each([['PowerPoint', pptx], ['Markdown', markdown]] as const)('%s rejects a 4.2 MB invalid slide array with bounded validation work', async (_name, post) => {
  // Build the hostile JSON in memory without retaining an equivalent array of objects.
  const body = '{"presentationData":{"subject":"Science","originalWriters":"T","topic":"Plants","slides":['
    + '{},'.repeat(1_399_899) + '{}]}}';
  const heapBefore = process.memoryUsage().heapUsed;
  const start = performance.now();
  const res = await post(new NextRequest('http://localhost/api/export', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
  }));
  const elapsed = performance.now() - start;
  const heapGrowth = process.memoryUsage().heapUsed - heapBefore;
  expect(body.length).toBeGreaterThan(4_000_000);
  expect(res.status).toBe(400);
  const result = await res.json();
  expect(result.error).toMatch(/^Invalid request: presentationData\.slides:/);
  expect(result.error.length).toBeLessThan(500);
  expect(elapsed).toBeLessThan(2000);
  expect(heapGrowth).toBeLessThan(256 * 1024 * 1024);
});
