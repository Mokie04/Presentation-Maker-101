import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/health/route';
import * as health from '@/lib/health';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe('health route response policy', () => {
  it('requires authentication before reading the body or running health checks', async () => {
    vi.stubEnv('APPSTORE_AUTH_ENABLED', 'true'); vi.stubEnv('APPSTORE_SHARED_SECRET', 'test-shared-secret');
    const check = vi.spyOn(health, 'checkHealth').mockResolvedValue({ textProvider: 'ok', imageProvider: 'ok' });
    const request = new NextRequest('http://localhost/api/health');
    const body = vi.spyOn(request, 'body', 'get');
    const response = await GET(request);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Authentication required.' });
    expect(check).not.toHaveBeenCalled(); expect(body).not.toHaveBeenCalled();
  });

  it('keeps the healthy 200 response shape without reading a body', async () => {
    vi.spyOn(health, 'checkHealth').mockResolvedValue({ textProvider: 'ok', imageProvider: 'ok' });
    const request = new NextRequest('http://localhost/api/health');
    const body = vi.spyOn(request, 'body', 'get');
    const response = await GET(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ textProvider: 'ok', imageProvider: 'ok' });
    expect(body).not.toHaveBeenCalled();
  });

  it.each([
    { textProvider: 'error', imageProvider: 'ok', expected: ['Text provider check failed.'] },
    { textProvider: 'ok', imageProvider: 'error', expected: ['Image provider check failed.'] },
    { textProvider: 'error', imageProvider: 'error', expected: ['Text provider check failed.', 'Image provider check failed.'] },
  ] as const)('sanitizes $textProvider / $imageProvider health results and logs the originals', async ({ textProvider, imageProvider, expected }) => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const errors = [
      ...(textProvider === 'error' ? ['Text Provider: LEAK TEXT_PROVIDER_API_KEY schema dump'] : []),
      ...(imageProvider === 'error' ? ['Image Provider: LEAK IMAGE_PROVIDER_API_KEY schema dump'] : []),
    ];
    vi.spyOn(health, 'checkHealth').mockResolvedValue({ textProvider, imageProvider, errors });
    const response = await GET(new NextRequest('http://localhost/api/health'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ textProvider, imageProvider, errors: expected });
    for (const error of errors) expect(log).toHaveBeenCalledWith('[health]', error);
  });

  it('uses a fixed failure message if the health service unexpectedly throws', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('LEAK TEXT_PROVIDER_API_KEY schema dump');
    vi.spyOn(health, 'checkHealth').mockRejectedValue(error);
    const response = await GET(new NextRequest('http://localhost/api/health'));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Health check failed.' });
    expect(log).toHaveBeenCalledWith('[health]', error);
  });
});
