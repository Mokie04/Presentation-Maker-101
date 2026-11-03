import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { describeFonts, fontsDirectory, manifestName } from '../../scripts/font-manifest.mjs';

type Manifest = Record<string, { bytes: number; sha256: string }>;

function manifestProblems(recorded: Manifest, actual: Manifest): string[] {
  const problems: string[] = [];
  for (const [file, entry] of Object.entries(actual)) {
    if (!recorded[file]) problems.push(`${file} is not in ${manifestName}`);
    else if (recorded[file].sha256 !== entry.sha256 || recorded[file].bytes !== entry.bytes) problems.push(`${file} changed`);
  }
  for (const file of Object.keys(recorded)) if (!actual[file]) problems.push(`${file} is listed but missing`);
  return problems;
}

describe('font manifest', () => {
  const recorded = JSON.parse(readFileSync(path.join(fontsDirectory, manifestName), 'utf8')) as Manifest;

  it('matches every file under src/app/fonts', () => {
    expect(manifestProblems(recorded, describeFonts()),
      'A font or licence file changed. Regenerate the metrics if a TTF changed, update ADR 0024, then run node scripts/font-manifest.mjs').toEqual([]);
  });

  it('pairs every served woff2 with its source TTF and every face with a licence text', () => {
    const files = Object.keys(recorded);
    const served = files.filter((file) => file.endsWith('.woff2'));
    expect(served).toHaveLength(9);
    for (const file of served) expect(files, file).toContain(`source/${file.replace(/\.woff2$/, '.ttf')}`);
    for (const face of ['Poppins', 'Arimo', 'Gelasio', 'Geist']) expect(files.some((file) => file.startsWith(face) && file.endsWith('.txt')), face).toBe(true);
  });

  it('self-test: reports a changed, an unlisted and a missing file', () => {
    const actual = { 'a.woff2': { bytes: 1, sha256: 'x' }, 'b.woff2': { bytes: 2, sha256: 'y' } };
    expect(manifestProblems({ 'a.woff2': { bytes: 1, sha256: 'z' }, 'c.woff2': { bytes: 3, sha256: 'w' } }, actual))
      .toEqual(['a.woff2 changed', `b.woff2 is not in ${manifestName}`, 'c.woff2 is listed but missing']);
  });
});
