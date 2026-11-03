import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { findEnvReads, listFiles, toPosix } from './guards';

const allowed = new Set([
  'lib/env.ts', // Owns lazy feature configuration reads and validation.
  'lib/sessionAuth.ts', // Owns the existing independent App Store auth configuration.
]);

it('reads process.env only at the configuration and session-auth boundaries', () => {
  const root = path.resolve('src');
  const files = listFiles(root, (name) => /\.[cm]?[jt]sx?$/.test(name));
  expect(files.length).toBeGreaterThan(100);
  const offenders = files
    .filter((file) => !allowed.has(toPosix(path.relative(root, file))))
    .flatMap((file) => findEnvReads(toPosix(path.relative(root, file)), readFileSync(file, 'utf8')));

  expect(offenders, 'Move direct process.env reads into the configuration boundary').toEqual([]);
  for (const file of Array.from(allowed)) expect(findEnvReads(file, readFileSync(path.join(root, file), 'utf8')), file).not.toEqual([]);
});

describe('config boundary checker self-test', () => {
  it.each([
    ['dot access', 'export const key = process.env.KEY;'],
    ['optional chaining', 'export const key = process?.env?.KEY;'],
    ['element access', "export const key = process['env'].KEY;"],
    ['template element access', 'export const key = process[`env`].KEY;'],
    ['destructuring', 'const { env } = process;\nexport const key = env.KEY;'],
    ['renamed destructuring', 'const { env: settings } = process;\nexport const key = settings.KEY;'],
    ['globalThis receiver', 'export const key = globalThis.process.env.KEY;'],
    ['bracketed globalThis receiver', "export const key = globalThis['process']?.env.KEY;"],
    ['named import', "import { env } from 'node:process';\nexport const key = env.KEY;"],
    ['renamed named import', "import { env as settings } from 'process';\nexport const key = settings.KEY;"],
    ['default import', "import proc from 'node:process';\nexport const key = proc.env.KEY;"],
    ['namespace import', "import * as proc from 'process';\nexport const key = proc.env.KEY;"],
    ['require', "const proc = require('node:process');\nexport const key = proc.env.KEY;"],
    ['wrapped expression', 'export const key = (process as NodeJS.Process).env.KEY;'],
  ])('reports %s', (_name, text) => {
    expect(findEnvReads('lib/violation.ts', text)).toHaveLength(1);
  });

  it('ignores strings, comments and unrelated names', () => {
    const text = "// process.env is read elsewhere\nconst note = 'process.env.KEY';\nconst processEnv = { env: 1 };\nexport const value = processEnv.env + note.length;";
    expect(findEnvReads('lib/clean.ts', text)).toEqual([]);
  });
});
