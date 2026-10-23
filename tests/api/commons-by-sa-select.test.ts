import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as select } from '@/app/api/commons-images/select/route';
import { imageMetadataSchema } from '@/lib/image-metadata';
import { commonsPage, COMMONS_THUMBNAIL } from '../lib/providers/commons-cases';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAICAIAAAB/FOjAAAAAE0lEQVR4nGNQaPhPEmIY1UALDQB5Ss+BakG97wAAAABJRU5ErkJggg==', 'base64');
afterEach(() => { vi.unstubAllGlobals(); });

describe('selecting a CC BY-SA Commons image', () => {
  it('returns metadata the export schema accepts', async () => {
    const page = commonsPage(42, 1, {
      LicenseShortName: { value: 'CC BY-SA 4.0' }, LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0' },
    });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ batchcomplete: true, query: { pages: [page] } }))
      .mockResolvedValueOnce(new Response(png, { headers: { 'content-type': 'image/png' } }));
    vi.stubGlobal('fetch', fetchMock);
    const response = await select(new NextRequest('http://localhost/api/commons-images/select', { method: 'POST', body: JSON.stringify({ fileId: 42 }) }));
    expect(response.status).toBe(200);
    const { metadata } = await response.json();
    expect(imageMetadataSchema.parse(metadata)).toMatchObject({ source: 'commons', fileId: 42, licenseKind: 'cc-by-sa',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', creator: 'Jane Doe', assetUrl: COMMONS_THUMBNAIL });
    expect(fetchMock.mock.calls[1][0]).toBe(COMMONS_THUMBNAIL);
  });
});
