/// <reference types="vite/client" />
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, type NextResponse } from 'next/server';
import * as textProvider from '@/lib/providers/text-provider';
import * as imageProvider from '@/lib/providers/image-provider';
import * as imageBatch from '@/lib/services/image-batch';
import * as documentParser from '@/lib/parsers/document-parser';
import * as pptxGenerator from '@/lib/services/pptx-generator';
import * as markdownGenerator from '@/lib/services/markdown-generator';
import * as health from '@/lib/health';
import * as nasa from '@/lib/providers/nasa-provider';
import * as commons from '@/lib/providers/commons-provider';

type Handler = (request: NextRequest) => Promise<NextResponse>;
const modules = import.meta.glob<Partial<Record<'GET' | 'POST', Handler>>>('/src/app/api/**/route.ts');
// Session bootstraps auth; every other API route must require it.
const protectedRoutes = Object.entries(modules).filter(([file]) => file !== '/src/app/api/session/route.ts');

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe('discovered API auth gates', () => {
  it('discovers all 11 protected routes, including both NASA and Commons endpoints', () => {
    expect(protectedRoutes).toHaveLength(11);
    expect(protectedRoutes.map(([file]) => file)).toEqual(expect.arrayContaining([
      '/src/app/api/nasa-images/search/route.ts', '/src/app/api/nasa-images/select/route.ts',
      '/src/app/api/commons-images/search/route.ts', '/src/app/api/commons-images/select/route.ts',
    ]));
  });

  it.each(protectedRoutes)('%s rejects unauthenticated requests before body reads or downstream work', async (file, load) => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('APPSTORE_AUTH_ENABLED', 'true');
    vi.stubEnv('APPSTORE_SHARED_SECRET', 'test-shared-secret');
    const unexpected = () => { throw new Error('Unexpected downstream work before authentication'); };
    const spies = [
      vi.spyOn(textProvider, 'generateSlideContent').mockImplementation(unexpected),
      vi.spyOn(imageProvider, 'generateSlideImage').mockImplementation(unexpected),
      vi.spyOn(imageBatch, 'processBatchImages').mockImplementation(unexpected),
      vi.spyOn(documentParser, 'parseDocument').mockImplementation(unexpected),
      vi.spyOn(pptxGenerator, 'buildPresentationPptx').mockImplementation(unexpected),
      vi.spyOn(markdownGenerator, 'buildPresentationMarkdown').mockImplementation(unexpected),
      vi.spyOn(health, 'checkHealth').mockImplementation(unexpected),
      vi.spyOn(nasa, 'searchNasaImages').mockImplementation(unexpected),
      vi.spyOn(nasa, 'getNasaImageCandidate').mockImplementation(unexpected),
      vi.spyOn(nasa, 'fetchNasaImageBase64').mockImplementation(unexpected),
      vi.spyOn(commons, 'searchCommonsImages').mockImplementation(unexpected),
      vi.spyOn(commons, 'fetchCommonsImageBase64').mockImplementation(unexpected),
    ];
    const routeModule = await load();
    const handlers = (['GET', 'POST'] as const).filter((method) => typeof routeModule[method] === 'function');
    expect(handlers.length).toBeGreaterThan(0);
    for (const method of handlers) {
      const request = new NextRequest(`http://localhost${file.slice('/src/app'.length, -'/route.ts'.length)}`, {
        method, ...(method === 'POST' ? { body: 'not JSON or form data' } : {}),
      });
      const body = vi.spyOn(request, 'body', 'get');
      const json = vi.spyOn(request, 'json');
      const form = vi.spyOn(request, 'formData');
      const response = await routeModule[method]!(request);
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'Authentication required.' });
      expect(body).not.toHaveBeenCalled(); expect(json).not.toHaveBeenCalled(); expect(form).not.toHaveBeenCalled();
    }
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });
});
