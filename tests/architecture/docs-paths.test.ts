import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { backtickedPaths, checkAdrIndex, checkDocument, listFiles, machinePaths, readAdrs, readAdrStatus, toPosix } from './guards';

const root = path.resolve('.');
const documents = ['ARCHITECTURE.md', 'GLOSSARY.md', 'README.md', 'THIRD_PARTY_NOTICES.md',
  ...listFiles('docs', (name) => name.endsWith('.md'), (file) => toPosix(file) === 'docs/archive').map(toPosix).sort()];

describe('documentation', () => {
  it('checks the main documents and every current docs file', () => {
    expect(documents).toEqual(expect.arrayContaining(['docs/README.md', 'docs/adr/README.md', 'docs/adr/0030-input-hardening.md', 'docs/code-review-2026-10-26.md']));
    expect(documents.some((file) => file.startsWith('docs/archive/'))).toBe(false);
    const paths = new Set(documents.flatMap((document) => backtickedPaths(readFileSync(document, 'utf8'))));
    expect(paths.size).toBeGreaterThanOrEqual(100);
  });

  it('keeps backticked repository paths and relative links valid', () => {
    const problems = documents.flatMap((document) => checkDocument(document, readFileSync(document, 'utf8'), root));
    expect(problems, 'Backticked repository paths must exist and relative links must resolve').toEqual([]);
  });

  it('lists every ADR in the index with its status', () => {
    expect(checkAdrIndex(readFileSync('docs/adr/README.md', 'utf8'), readAdrs('docs/adr')), 'docs/adr/README.md must match the ADR files').toEqual([]);
  });
});

describe('documentation checker self-test', () => {
  const files = new Set([path.resolve(root, 'src/real.ts'), path.resolve(root, 'docs/adr/0001-real.md'), path.resolve(root, 'scripts/real.mjs')]);
  const exists = (file: string) => files.has(file);

  it('reports a missing backticked path under every checked prefix', () => {
    const text = '`src/real.ts` `src/gone.ts` `scripts/gone.mjs` `public/gone.png` `tests/gone.test.ts` `.github/gone.yml` `vercel.json` `src/real.ts:12`';
    expect(checkDocument('docs/x.md', text, root, exists)).toEqual([
      'docs/x.md: `src/gone.ts` does not exist', 'docs/x.md: `scripts/gone.mjs` does not exist', 'docs/x.md: `public/gone.png` does not exist',
      'docs/x.md: `tests/gone.test.ts` does not exist', 'docs/x.md: `.github/gone.yml` does not exist', 'docs/x.md: `vercel.json` does not exist',
    ]);
  });

  it('reports a broken relative link and skips web and anchor links', () => {
    const text = '[ok](adr/0001-real.md#context) [web](https://example.com) [here](#top) [broken](adr/0099-gone.md)';
    expect(checkDocument('docs/x.md', text, root, exists)).toEqual(['docs/x.md: link (adr/0099-gone.md) does not resolve']);
  });

  it('reports machine-specific paths in links and text even when the file exists on this computer', () => {
    // Every path "exists": the rule must not depend on the author's disk, which is how 25 such links reached CI.
    const everything = () => true;
    const text = [
      '[evidence](/Users/someone/.codex/visualizations/run-1/summary.json)',
      'Run folder: `/tmp/run-1/` and /private/tmp/claude-501/scratch/notes.md.',
      'Windows: C:\\Users\\me\\Desktop\\capture.png',
    ].join('\n');
    const reason = 'is not portable; describe the evidence in words or keep it in the repository';
    expect(checkDocument('docs/x.md', text, root, everything)).toEqual([
      `docs/x.md: machine-specific path (/Users/someone/.codex/visualizations/run-1/summary.json) ${reason}`,
      `docs/x.md: machine-specific path (/tmp/run-1/) ${reason}`,
      `docs/x.md: machine-specific path (/private/tmp/claude-501/scratch/notes.md) ${reason}`,
      `docs/x.md: machine-specific path (C:\\Users\\me\\Desktop\\capture.png) ${reason}`,
    ]);
  });

  it('does not flag repository paths that merely contain a home or tmp folder name', () => {
    const text = 'See src/components/home/HomeHero.tsx, public/tmp/x.png and docs/home/notes.md.';
    expect(machinePaths(text)).toEqual([]);
    expect(checkDocument('docs/x.md', text, root, () => true)).toEqual([]);
  });

  it('reports an absolute link that is not a machine path', () => {
    expect(checkDocument('docs/x.md', '[x](/docs/adr/0001-real.md)', root, () => true)).toEqual([
      'docs/x.md: link (/docs/adr/0001-real.md) is an absolute path; use a relative link',
    ]);
  });

  it('reports an ADR missing from the index, a stale row and a disagreeing status', () => {
    const adrs = new Map([['0001-a.md', 'Status: Accepted\n'], ['0002-b.md', 'Status: Proposed\n']]);
    const index = '| [0001](0001-a.md) | Proposed | | A |\n| [0003](0003-c.md) | Accepted | | C |\n';
    expect(checkAdrIndex(index, adrs)).toEqual([
      'index says Proposed for 0001-a.md, the ADR says Accepted', 'index does not list 0002-b.md', 'index lists 0003-c.md, which does not exist',
    ]);
  });

  it.each([
    ['Status: Accepted locally; PR and release pending'],
    ['Status: Accepted for local implementation; release review pending'],
    ['Status: Done'],
    ['Date: 2026-10'],
  ])('rejects "%s"', (line) => {
    expect(readAdrStatus('0001-a.md', `# 0001\n\n${line}\n`).problem).toBeDefined();
  });

  it.each([['Status: Accepted'], ['Status: Accepted (theme roadmap Phase 1)'], ['Status: Not adopted'], ['Status: Superseded by ADR 0031']])('accepts "%s"', (line) => {
    expect(readAdrStatus('0001-a.md', `# 0001\n\n${line}\n`).problem).toBeUndefined();
  });
});

it('keeps the docs index free of plan files', () => {
  expect(existsSync('docs/superpowers')).toBe(false);
});
