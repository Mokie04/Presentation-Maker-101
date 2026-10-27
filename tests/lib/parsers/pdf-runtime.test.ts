import { expect, it } from 'vitest';
import { shouldSkipRealPdfTest } from '../../helpers/pdf-runtime';

it('keeps real PDF coverage enabled on Node 22/24 and skips only Node 25+', () => {
  for (const version of ['22.12.0', '22.23.4', '24.22.1']) {
    expect(shouldSkipRealPdfTest(version), version).toBe(false);
  }
  for (const version of ['25.0.0', '26.3.0', '30.0.0']) {
    expect(shouldSkipRealPdfTest(version), version).toBe(true);
  }
});
