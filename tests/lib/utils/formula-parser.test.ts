import { describe, it, expect } from 'vitest';
import { underscoreChemistryCases } from '../../helpers/underscore-chemistry-cases';
import {
  parseFormulaToSegments,
  formatFormulaToUnicode,
} from '@/lib/utils/formula-parser';

describe('formula-parser', () => {
  describe('parseFormulaToSegments', () => {
    it.each(underscoreChemistryCases)('preserves chemical or literal underscore notation: $input', ({ input, markdown, subscripts }) => {
      const segments = parseFormulaToSegments(input);
      expect(segments.filter(segment => segment.subscript).map(segment => segment.text)).toEqual(subscripts);
      expect(segments.map(segment => segment.text).join('')).toBe(subscripts.length ? input.replace(/[_{}]/g, '') : input);
      expect(formatFormulaToUnicode(input)).toBe(markdown);
    });

    it('preserves underscores between generated prose words of at least three letters', () => {
      let seed = 0x51a7;
      const word = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const length = 3 + seed % 14;
        let result = '';
        for (let index = 0; index < length; index++) {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          result += String.fromCharCode(97 + seed % 26);
        }
        return result;
      };
      for (let index = 0; index < 2000; index++) {
        const input = `${word()}_${word()}_${word()}`;
        expect(parseFormulaToSegments(input).map(segment => segment.text).join(''), input).toBe(input);
        expect(formatFormulaToUnicode(input), input).toBe(input);
      }
    });

    it.each([
      ['3x^2-4x+1', [{ text: '3x' }, { text: '2', superscript: true }, { text: '-4x+1' }]],
      ['x^n+1', [{ text: 'x' }, { text: 'n', superscript: true }, { text: '+1' }]],
      ['10^-5+2', [{ text: '10' }, { text: '-5', superscript: true }, { text: '+2' }]],
      ['x_1+x_2', [{ text: 'x' }, { text: '1', subscript: true }, { text: '+x' }, { text: '2', subscript: true }]],
      ['a_n+1', [{ text: 'a' }, { text: 'n', subscript: true }, { text: '+1' }]],
      ['a_{n+1}', [{ text: 'a' }, { text: 'n+1', subscript: true }]],
      ['x^{10}', [{ text: 'x' }, { text: '10', superscript: true }]],
      ['(a+b)^2', [{ text: '(a+b)' }, { text: '2', superscript: true }]],
      ['v_0', [{ text: 'v' }, { text: '0', subscript: true }]],
      ['2_1', [{ text: '2' }, { text: '1', subscript: true }]],
      ['(x+y)_1', [{ text: '(x+y)' }, { text: '1', subscript: true }]],
    ])('bounds script runs in %s', (input, expected) => {
      expect(parseFormulaToSegments(input as string)).toEqual(expected);
    });

    it.each([
      'snake_case_word', 'teacher_name@school.edu', 'Wi-Fi', 'X-Ray', 'COVID-19',
      'B-52', 'R2-D2', 'MP3', 'Q1', 'H2O-invalid', 'H2Ofoo', 'H2Q',
      'H2O@example.com', 'H2O_guide', 'H2O.example', 'guide.H2O',
      'a_name@school.edu', 'x_1@school.edu',
      'A pen costs $5 and a book $10.', '$1,000', '$5.50',
      'x^', 'x^!', 'x^{10', 'a_', 'a_{n+1',
    ])('keeps non-formulas and incomplete markup literal: %s', (input) => {
      expect(parseFormulaToSegments(input)).toEqual([{ text: input }]);
      expect(formatFormulaToUnicode(input)).toBe(input);
    });

    it.each(['$x$', '$$x$$', '$x=2$', '$x^{2}$'])('recognizes math delimiters in %s', (input) => {
      expect(parseFormulaToSegments(input).map(segment => segment.text).join('')).toBe(
        input.includes('=') ? 'x=2' : input.includes('^') ? 'x2' : 'x'
      );
    });

    it('preserves every character in generated ordinary text', () => {
      // Arrow/radical normalization is an existing explicit syntax exception;
      // this alphabet cannot generate either -> / --> or sqrt(...).
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-@.   ';
      let seed = 0x51a7;
      const samples = ['', ' ', '   ', 'H2O', 'Wi-Fi', 'X-Ray'];
      for (let sample = 0; sample < 2000; sample++) {
        let text = '';
        for (let character = 0; character < sample % 120; character++) {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          text += alphabet[seed % alphabet.length];
        }
        samples.push(text);
      }
      for (const input of samples) {
        expect(parseFormulaToSegments(input).map(segment => segment.text).join(''), input).toBe(input);
      }
    });

    it('parses basic text without formulas as a single segment', () => {
      const segments = parseFormulaToSegments('Photosynthesis is a vital process.');
      expect(segments).toEqual([
        { text: 'Photosynthesis is a vital process.' },
      ]);
    });

    it('parses chemical formulas into subscripts', () => {
      const water = parseFormulaToSegments('Water has the formula H2O.');
      expect(water).toEqual([
        { text: 'Water has the formula H' },
        { text: '2', subscript: true },
        { text: 'O.' },
      ]);

      const glucose = parseFormulaToSegments('Glucose formula: C6H12O6');
      expect(glucose).toEqual([
        { text: 'Glucose formula: C' },
        { text: '6', subscript: true },
        { text: 'H' },
        { text: '12', subscript: true },
        { text: 'O' },
        { text: '6', subscript: true },
      ]);
    });

    it('parses chemical equations with reaction arrows', () => {
      const reaction = parseFormulaToSegments('2H2 + O2 -> 2H2O');
      expect(reaction).toEqual([
        { text: '2H' },
        { text: '2', subscript: true },
        { text: ' + O' },
        { text: '2', subscript: true },
        { text: ' → 2H' },
        { text: '2', subscript: true },
        { text: 'O' },
      ]);
    });

    it('parses ionic charges into superscripts', () => {
      const ion = parseFormulaToSegments('Calcium ion Ca2+ and chloride Cl-');
      expect(ion).toEqual([
        { text: 'Calcium ion Ca' },
        { text: '2+', superscript: true },
        { text: ' and chloride Cl' },
        { text: '-', superscript: true },
      ]);
    });

    it('parses exponents with caret notation', () => {
      const pythagoras = parseFormulaToSegments('a^2 + b^2 = c^2');
      expect(pythagoras).toEqual([
        { text: 'a' },
        { text: '2', superscript: true },
        { text: ' + b' },
        { text: '2', superscript: true },
        { text: ' = c' },
        { text: '2', superscript: true },
      ]);

      const groupedExp = parseFormulaToSegments('10^(n+1)');
      expect(groupedExp).toEqual([
        { text: '10' },
        { text: 'n+1', superscript: true },
      ]);
    });

    it('parses subscripts with underscore notation', () => {
      const seq = parseFormulaToSegments('Term x_1 and x_{10}');
      expect(seq).toEqual([
        { text: 'Term x' },
        { text: '1', subscript: true },
        { text: ' and x' },
        { text: '10', subscript: true },
      ]);
    });

    it('parses square roots and radicals', () => {
      const root1 = parseFormulaToSegments('Calculate sqrt(16) = 4');
      expect(root1).toEqual([
        { text: 'Calculate √(16) = 4' },
      ]);

      const root2 = parseFormulaToSegments('Area radical \\sqrt{25}');
      expect(root2).toEqual([
        { text: 'Area radical √(25)' },
      ]);
    });

    it('parses LaTeX math syntax with delimiters ($...$)', () => {
      const latex = parseFormulaToSegments('Formula: $x^2 + y^2 = r^2$');
      expect(latex).toEqual([
        { text: 'Formula: x' },
        { text: '2', superscript: true },
        { text: ' + y' },
        { text: '2', superscript: true },
        { text: ' = r' },
        { text: '2', superscript: true },
      ]);
    });

    it('replaces common LaTeX math commands with Unicode symbols', () => {
      const mathOps = parseFormulaToSegments('x \\pm 5 \\times 2 \\div 4 \\le 10 \\ge 0 \\ne 7 \\pi');
      expect(mathOps).toEqual([
        { text: 'x ± 5 × 2 ÷ 4 ≤ 10 ≥ 0 ≠ 7 π' },
      ]);
    });
  });

  describe('formatFormulaToUnicode', () => {
    it.each([
      ['a_n', 'a_n'], ['x^k', 'x^k'], ['a_{n+1}', 'a_{n+1}'],
      ['x^{nk}', 'x^{nk}'], ['x^{n+1}', 'xⁿ⁺¹'], ['a_{x+1}', 'aₓ₊₁'],
    ])('keeps unsupported script characters readable in %s', (input, expected) => {
      expect(formatFormulaToUnicode(input)).toBe(expected);
    });

    it('converts chemical formulas to Unicode subscripts', () => {
      expect(formatFormulaToUnicode('H2O and CO2')).toBe('H₂O and CO₂');
      expect(formatFormulaToUnicode('C6H12O6')).toBe('C₆H₁₂O₆');
    });

    it('converts exponents to Unicode superscripts', () => {
      expect(formatFormulaToUnicode('x^2 + y^2 = c^2')).toBe('x² + y² = c²');
      expect(formatFormulaToUnicode('10^5')).toBe('10⁵');
    });

    it('converts radicals and arrows to Unicode', () => {
      expect(formatFormulaToUnicode('sqrt(16) = 4')).toBe('√16 = 4');
      expect(formatFormulaToUnicode('2H2 + O2 -> 2H2O')).toBe('2H₂ + O₂ → 2H₂O');
    });
  });
});
