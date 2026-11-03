import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { metricsModuleFile, metricsModuleSource, sourceFont } from '../../scripts/generate-slide-fit-metrics.mjs';

// Swapping a bundled font without regenerating its metrics must fail here.
describe('generated slide-fit metrics', () => {
  it.each(['Poppins', 'Arimo', 'Gelasio'])('%s metrics equal a fresh computation from the source TTFs', (font) => {
    expect(metricsModuleSource(font), `Run node scripts/generate-slide-fit-metrics.mjs ${font}`).toBe(readFileSync(metricsModuleFile(font), 'utf8'));
  });

  it('self-test: a different font file produces a different table', () => {
    const swapped = { regular: readFileSync(sourceFont('Arimo', 'Regular')), bold: readFileSync(sourceFont('Arimo', 'Bold')) };
    expect(metricsModuleSource('Poppins', swapped)).not.toBe(readFileSync(metricsModuleFile('Poppins'), 'utf8'));
  });
});
