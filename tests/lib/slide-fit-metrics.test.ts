import { expect, it } from 'vitest';
import { POPPINS_METRICS } from '@/lib/slide-fit-metrics';
it('covers ASCII and classroom punctuation, operators and digits in both faces', () => {
  const characters = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('') + '‘’“”–—•×÷±≤≥≠≈π°⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉';
  for (const face of [POPPINS_METRICS.regular, POPPINS_METRICS.bold]) {
    expect(face.lineHeight).toBeGreaterThan(1);
    for (const char of characters) expect(face.widths[char], char).toBeGreaterThan(0);
  }
});
