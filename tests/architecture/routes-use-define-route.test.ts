import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkRoute, checkVercelConfig, isRouteFile, listFiles, toPosix } from './guards';

const exemptions = new Set(['session/route.ts']); // Session bootstraps auth and cannot require an existing session.

describe('route policy', () => {
  const root = path.resolve('src/app/api');
  const files = listFiles(root, isRouteFile).map((file) => toPosix(path.relative(root, file)));

  it('assigns every protected HTTP handler directly from the imported defineRoute', () => {
    const protectedFiles = files.filter((file) => !exemptions.has(file));
    expect(protectedFiles).toHaveLength(11);
    let handlers = 0;
    const problems: string[] = [];
    for (const file of protectedFiles) {
      const report = checkRoute(file, readFileSync(path.join(root, file), 'utf8'));
      handlers += report.handlers;
      problems.push(...report.problems);
    }
    expect(problems, 'HTTP handlers must use defineRoute from @/lib/api').toEqual([]);
    expect(handlers).toBeGreaterThanOrEqual(protectedFiles.length);
  });

  it('keeps the session exemption and sets maxDuration in every route file', () => {
    expect(files).toEqual(expect.arrayContaining(Array.from(exemptions)));
    const problems = files.flatMap((file) => checkRoute(file, readFileSync(path.join(root, file), 'utf8'), { exempt: exemptions.has(file) }).problems);
    expect(problems, 'Every route file exports its own maxDuration').toEqual([]);
  });

  it('leaves route durations out of vercel.json', () => {
    expect(checkVercelConfig(readFileSync('vercel.json', 'utf8'))).toEqual([]);
  });
});

describe('route policy checker self-test', () => {
  const valid = "import { defineRoute } from '@/lib/api';\nexport const maxDuration = 30;\nexport const POST = defineRoute({ failureMessage: 'x', handler: async () => new Response() });\n";

  it('accepts a conforming route', () => {
    expect(checkRoute('valid/route.ts', valid)).toEqual({ handlers: 1, problems: [] });
  });

  it.each(['route.ts', 'route.tsx', 'route.js', 'route.jsx', 'route.mts', 'route.mjs', 'route.cts'])('treats %s as a route file', (name) => {
    expect(isRouteFile(name)).toBe(true);
  });

  it.each([
    ['a plain exported function', "import { defineRoute } from '@/lib/api';\nexport const maxDuration = 30;\nexport async function POST() { return new Response(); }\n"],
    ['a handler from another wrapper', "import { wrap } from '@/lib/wrap';\nexport const maxDuration = 30;\nexport const POST = wrap({});\n"],
    ['a local defineRoute function', "export const maxDuration = 30;\nfunction defineRoute(x: unknown) { return x; }\nexport const POST = defineRoute({});\n"],
    ['a local defineRoute variable', "export const maxDuration = 30;\nconst defineRoute = (x: unknown) => x;\nexport const POST = defineRoute({});\n"],
    ['defineRoute from the wrong module', "import { defineRoute } from './fake';\nexport const maxDuration = 30;\nexport const POST = defineRoute({});\n"],
    ['an aliased import', "import { defineRoute as define } from '@/lib/api';\nimport { other as defineRoute } from './fake';\nexport const maxDuration = 30;\nexport const POST = defineRoute({});\n"],
    ['a re-exported handler', "export { POST } from './handlers';\nexport const maxDuration = 30;\n"],
    ['a missing maxDuration', "import { defineRoute } from '@/lib/api';\nexport const POST = defineRoute({});\n"],
    ['a computed maxDuration', "import { defineRoute } from '@/lib/api';\nexport const maxDuration = LIMIT;\nexport const POST = defineRoute({});\n"],
  ])('reports %s', (_name, text) => {
    expect(checkRoute('violation/route.tsx', text).problems.length).toBeGreaterThan(0);
  });

  it('still requires maxDuration on an exempt route', () => {
    expect(checkRoute('session/route.ts', 'export async function GET() { return new Response(); }\n', { exempt: true }).problems).toHaveLength(1);
  });

  it('reports a functions block in vercel.json', () => {
    expect(checkVercelConfig('{"functions":{"src/app/api/generate/route.ts":{"maxDuration":60}}}')).toHaveLength(1);
  });
});
