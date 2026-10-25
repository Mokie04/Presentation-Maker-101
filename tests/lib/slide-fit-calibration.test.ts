import { expect, it } from 'vitest';
import { fitText } from '@/lib/slide-fit';
import corpus from '../fixtures/slide-fit-corpus.json';

it.each(['passive', 'editable'] as const)('stays within one line of underestimation on the measured %s Chrome/Poppins corpus', variant => {
  const errors = corpus.map(({ text, browserLines, browserEditableLines }) => {
    const result = fitText({ paragraphs: [text], widthIn: 13.333 * 0.55, heightIn: 100,
      baseSizePt: 35, floorPt: 35, bulletIndentIn: variant === 'editable' ? 2 * 35 / 72 : 0.25, lineHeight: 46 / 35 });
    expect(result.lines, text).toBeGreaterThanOrEqual((variant === 'editable' ? browserEditableLines : browserLines) - 1);
    return result.lines - (variant === 'editable' ? browserEditableLines : browserLines);
  });
  console.info('Calibration (estimated minus browser lines):', {
    count: errors.length, mean: errors.reduce((a, b) => a + b, 0) / errors.length,
    meanAbsolute: errors.reduce((a, b) => a + Math.abs(b), 0) / errors.length,
    min: Math.min(...errors), max: Math.max(...errors),
  });
});
