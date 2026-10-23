import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';

const rootFiles = new Set(['ARCHITECTURE.md', 'GLOSSARY.md', 'README.md', '.env.example', 'package.json']);

it('keeps backticked repository paths in architecture docs valid', () => {
  const documents = ['ARCHITECTURE.md', 'GLOSSARY.md', 'docs/README.md',
    ...readdirSync('docs/adr').filter((name) => name.endsWith('.md')).map((name) => `docs/adr/${name}`)];
  const paths = new Set<string>();

  for (const document of documents) {
    const content = readFileSync(document, 'utf8');
    for (const [, token] of Array.from(content.matchAll(/`([^`\n]+)`/g))) {
      if (/[<>{}*?\[\]]/.test(token)) continue; // Examples with placeholders or globs are not concrete paths.
      if (rootFiles.has(token) || /^(?:src|tests|docs|\.github)\/\S+$/.test(token)) paths.add(token);
    }
  }

  expect(paths.size).toBeGreaterThanOrEqual(20);
  const missing = Array.from(paths).filter((file) => !existsSync(path.resolve(file)));
  expect(missing, 'Backticked repository paths must exist').toEqual([]);
});
