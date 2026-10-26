// Dev-only: reads installed Office fonts in place; never copies them into the repo.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { readFontMetrics, characters } from './generate-slide-fit-metrics.mjs';

const report = [];
for (const [system, standIn] of [['Arial', 'Arimo'], ['Georgia', 'Gelasio']]) {
  for (const style of ['Regular', 'Bold', 'Italic']) {
    const path = `/System/Library/Fonts/Supplemental/${system}${style === 'Regular' ? '' : ` ${style}`}.ttf`;
    const bundled = new URL(`../src/app/fonts/${standIn}-${style}.ttf`, import.meta.url);
    const real = readFontMetrics(path, { rounded: false, includeMissing: true });
    const replacement = readFontMetrics(bundled, { rounded: false, includeMissing: true });
    const deltas = Array.from(characters, char => ({ char, difference: Math.abs(real.widths[char] - replacement.widths[char]) }));
    const summarize = values => ({ count: values.length, maxPer1000Em: Math.max(...values.map(x => x.difference)),
      meanPer1000Em: values.reduce((sum, x) => sum + x.difference, 0) / values.length });
    report.push({ system, standIn, style, systemPath: path,
      systemSha256: createHash('sha256').update(readFileSync(path)).digest('hex'),
      bundledSha256: createHash('sha256').update(readFileSync(bundled)).digest('hex'),
      allCharacters: summarize(deltas),
      sharedGlyphs: summarize(deltas.filter(x => !real.missing.includes(x.char) && !replacement.missing.includes(x.char))),
      systemMissing: real.missing, standInMissing: replacement.missing,
      maximumDeviationCharacters: deltas.filter(x => x.difference === Math.max(...deltas.map(x => x.difference))),
    });
  }
}
const json = JSON.stringify(report, null, 2) + '\n';
if (process.argv[2]) writeFileSync(process.argv[2], json);
process.stdout.write(json);
