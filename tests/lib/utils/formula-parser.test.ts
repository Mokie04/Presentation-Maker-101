import { describe, it, expect } from 'vitest';
import {
  parseFormulaToSegments,
  formatFormulaToUnicode,
} from '@/lib/utils/formula-parser';

describe('formula-parser', () => {
  describe('parseFormulaToSegments', () => {
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
