import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(file) : /\.[cm]?[jt]sx?$/.test(entry.name) ? [file] : [];
  });
}

it('reads process.env only at the configuration and session-auth boundaries', () => {
  const root = path.resolve('src');
  const allowed = new Set([
    'lib/env.ts', // Owns lazy feature configuration reads and validation.
    'lib/sessionAuth.ts', // Owns the existing independent App Store auth configuration.
  ]);
  const offenders = sourceFiles(root)
    .filter((file) => /\bprocess\s*(?:\.\s*env\b|\[\s*['"]env['"]\s*\])/.test(readFileSync(file, 'utf8')))
    .map((file) => path.relative(root, file).split(path.sep).join('/'))
    .filter((file) => !allowed.has(file));

  expect(offenders, 'Move direct process.env reads into the configuration boundary').toEqual([]);
});
