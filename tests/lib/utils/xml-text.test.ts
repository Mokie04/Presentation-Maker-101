import { expect, it } from 'vitest';
import { stripIllegalXmlCharacters } from '@/lib/utils/xml-text';

it('removes exactly the XML 1.0 forbidden characters without escaping or normalizing text', () => {
  const controls = Array.from({ length: 32 }, (_, i) => String.fromCharCode(i)).join('');
  expect(stripIllegalXmlCharacters(controls + '\uFFFE\uFFFF')).toBe('\t\n\r');
  const safe = 'Teacher text\t\n\r & < > " \' 😀 العربية H2O x^2';
  expect(stripIllegalXmlCharacters(safe)).toBe(safe);
  expect(stripIllegalXmlCharacters('')).toBe('');
});
