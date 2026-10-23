import { expect, it, vi } from 'vitest';
import { nasaAssetUrlSchema, nasaImageMetadataSchema } from '@/lib/image-metadata';
import { searchNasaImages } from '@/lib/providers/nasa-provider';

const path = '/image/earth/earth~thumb.jpg?q=a%2Fb';
const canonical = `https://images-assets.nasa.gov${path}`;

it.each([
  { origin: 'http://images-assets.nasa.gov', provider: true, metadata: false },
  { origin: 'http://images-assets.nasa.gov:80', provider: true, metadata: false },
  { origin: 'https://images-assets.nasa.gov', provider: true, metadata: true },
  { origin: 'https://images-assets.nasa.gov:443', provider: true, metadata: true },
  { origin: 'https://evil.example', provider: false, metadata: false },
  { origin: 'https://images-assets.nasa.gov.evil.example', provider: false, metadata: false },
  { origin: 'https://user:pass@images-assets.nasa.gov', provider: false, metadata: false },
  { origin: 'http://user:pass@images-assets.nasa.gov', provider: false, metadata: false },
  { origin: 'https://images-assets.nasa.gov:8443', provider: false, metadata: false },
  { origin: 'http://images-assets.nasa.gov:443', provider: false, metadata: false },
  { origin: 'https://images-assets.nasa.gov:80', provider: false, metadata: false },
  { origin: 'ftp://images-assets.nasa.gov', provider: false, metadata: false },
  { origin: 'file://images-assets.nasa.gov', provider: false, metadata: false },
])('preserves provider normalization and metadata trust for $origin', async ({ origin, provider, metadata }) => {
  const url = origin + path;
  const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ collection: { items: [{
    href: url, data: [{ nasa_id: 'earth', media_type: 'image' }],
    links: [{ href: url, rel: 'preview', render: 'image' }],
  }] } }));
  const pending = searchNasaImages('Earth', { fetchFn });
  if (provider) await expect(pending).resolves.toMatchObject([{ sourceUrl: canonical, previewUrl: canonical }]);
  else await expect(pending).rejects.toThrow('Untrusted NASA asset URL.');
  expect(fetchFn).toHaveBeenCalledOnce();
  expect(nasaAssetUrlSchema.safeParse(url).success).toBe(metadata);
  expect(nasaImageMetadataSchema.safeParse({ source: 'nasa', nasaId: 'earth', assetUrl: url,
    previewUrl: url, sourceUrl: url, rendition: 'large', mimeType: 'image/jpeg' }).success).toBe(metadata);
  if (metadata) expect(nasaAssetUrlSchema.parse(url)).toBe(canonical);
});
