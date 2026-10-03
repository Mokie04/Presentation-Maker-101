export interface FormulaSegment {
  text: string;
  subscript?: boolean;
  superscript?: boolean;
  isMath?: boolean;
  bold?: boolean;
}

// Unicode maps for superscripts and subscripts
export const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  'n': 'ⁿ', 'i': 'ⁱ', 'x': 'ˣ',
};

export const SUBSCRIPT_MAP: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
  'a': 'ₐ', 'e': 'ₑ', 'o': 'ₒ', 'x': 'ₓ',
};

// Common LaTeX math replacements
const LATEX_REPLACEMENTS: [RegExp, string][] = [
  [/\\pm\b/g, '±'],
  [/\\times\b/g, '×'],
  [/\\div\b/g, '÷'],
  [/\\le(q)?\b/g, '≤'],
  [/\\ge(q)?\b/g, '≥'],
  [/\\ne(q)?\b/g, '≠'],
  [/\\approx\b/g, '≈'],
  [/\\infty\b/g, '∞'],
  [/\\pi\b/g, 'π'],
  [/\\alpha\b/g, 'α'],
  [/\\beta\b/g, 'β'],
  [/\\gamma\b/g, 'γ'],
  [/\\delta\b/g, 'δ'],
  [/\\theta\b/g, 'θ'],
  [/\\lambda\b/g, 'λ'],
  [/\\mu\b/g, 'μ'],
  [/\\sigma\b/g, 'σ'],
  [/\\omega\b/g, 'ω'],
  [/\\Delta\b/g, 'Δ'],
  [/\\Sigma\b/g, 'Σ'],
  [/\\Omega\b/g, 'Ω'],
  [/\\degree\b/g, '°'],
  [/\\circ\b/g, '°'],
  [/\\rightarrow\b/g, '→'],
  [/\\to\b/g, '→'],
  [/-->|->/g, '→'],
];

/**
 * Pre-processes LaTeX math expressions, radicals, and arrows in text
 */
function normalizeMathSymbols(input: string): string {
  let text = input;

  // 1. Remove LaTeX $ or $$ wrapping delimiters
  text = text.replace(/\$\$([^\$]+)\$\$/g, '$1');
  text = text.replace(/\$([^\$]+)\$/g, '$1');

  // 2. Normalize \text{...} -> ...
  text = text.replace(/\\text\{([^\}]+)\}/g, '$1');

  // 3. Normalize radicals: \sqrt{...} or sqrt(...) -> √( ... )
  text = text.replace(/\\sqrt\{([^\}]+)\}/g, '√($1)');
  text = text.replace(/\bsqrt\(([^)]+)\)/g, '√($1)');

  // 4. Standard LaTeX symbols and arrows
  for (const [pattern, replacement] of LATEX_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }

  return text;
}

/**
 * Parses chemical formulas and equations, recognizing:
 * - Elements with numeric subscripts (H2O, CO2, C6H12O6, 2H2, 2H2O)
 * - Ionic charges (Ca2+, Cl-, Fe3+, SO4^2-)
 */
function parseChemicalFormula(formulaWord: string): FormulaSegment[] | null {
  // Matches optional coefficient followed by chemical symbols and digits/charges
  const m = /^(\d+)?([A-Z][A-Za-z0-9^+-]*)$/.exec(formulaWord);
  if (!m) return null;

  const coeff = m[1] || '';
  const formula = m[2];

  // Must contain at least one element followed by a number or charge
  if (!/[A-Z][a-z]?\d|[A-Z][a-z]?\^?[0-9]*[+-]/.test(formula)) {
    return null;
  }

  const tokens: FormulaSegment[] = [];
  if (coeff) {
    tokens.push({ text: coeff });
  }

  let rem = formula;
  const chargeMatch = /(\^?[0-9]*[+-])$/.exec(rem);
  let charge = '';
  if (chargeMatch) {
    charge = chargeMatch[1];
    rem = rem.slice(0, -charge.length);
  }

  const elemNumRegex = /([A-Z][a-z]?)|(\d+)/g;
  let em: RegExpExecArray | null;
  while ((em = elemNumRegex.exec(rem)) !== null) {
    if (em[1]) {
      tokens.push({ text: em[1] });
    } else if (em[2]) {
      tokens.push({ text: em[2], subscript: true });
    }
  }

  if (charge) {
    const cleanCharge = charge.startsWith('^') ? charge.slice(1) : charge;
    tokens.push({ text: cleanCharge, superscript: true });
  }

  return tokens.length > 0 ? tokens : null;
}

/**
 * Parses any string into a sequential array of FormulaSegment objects
 * supporting exponents (x^2), subscripts (x_1, H2O), radicals (√), and symbols.
 */
export function parseFormulaToSegments(rawText: string): FormulaSegment[] {
  if (!rawText || rawText.trim().length === 0) {
    return [];
  }

  const normalized = normalizeMathSymbols(rawText);

  const segments: FormulaSegment[] = [];
  let buffer = '';

  const flushBuffer = () => {
    if (buffer.length > 0) {
      segments.push({ text: buffer });
      buffer = '';
    }
  };

  let i = 0;
  while (i < normalized.length) {
    // Check for caret superscript: ^2, ^(n+1), ^{n+1}
    if (normalized[i] === '^') {
      flushBuffer();
      i++;
      let expText = '';
      if (normalized[i] === '(') {
        i++;
        const closeParen = normalized.indexOf(')', i);
        if (closeParen !== -1) {
          expText = normalized.slice(i, closeParen);
          i = closeParen + 1;
        } else {
          expText = normalized.slice(i);
          i = normalized.length;
        }
      } else if (normalized[i] === '{') {
        i++;
        const closeBrace = normalized.indexOf('}', i);
        if (closeBrace !== -1) {
          expText = normalized.slice(i, closeBrace);
          i = closeBrace + 1;
        } else {
          expText = normalized.slice(i);
          i = normalized.length;
        }
      } else {
        const match = /^[0-9a-zA-Z+-]+/.exec(normalized.slice(i));
        if (match) {
          expText = match[0];
          i += match[0].length;
        }
      }

      if (expText) {
        segments.push({ text: expText, superscript: true });
      }
      continue;
    }

    // Check for underscore subscript: _1, _{10}, _(i)
    if (normalized[i] === '_') {
      flushBuffer();
      i++;
      let subText = '';
      if (normalized[i] === '{') {
        i++;
        const closeBrace = normalized.indexOf('}', i);
        if (closeBrace !== -1) {
          subText = normalized.slice(i, closeBrace);
          i = closeBrace + 1;
        } else {
          subText = normalized.slice(i);
          i = normalized.length;
        }
      } else if (normalized[i] === '(') {
        i++;
        const closeParen = normalized.indexOf(')', i);
        if (closeParen !== -1) {
          subText = normalized.slice(i, closeParen);
          i = closeParen + 1;
        } else {
          subText = normalized.slice(i);
          i = normalized.length;
        }
      } else {
        const match = /^[0-9a-zA-Z+-]+/.exec(normalized.slice(i));
        if (match) {
          subText = match[0];
          i += match[0].length;
        }
      }

      if (subText) {
        segments.push({ text: subText, subscript: true });
      }
      continue;
    }

    // Check for word boundary to identify chemical formulas (e.g. H2O, 2H2, CO2, C6H12O6, Ca2+, Cl-)
    const isWordStart = i === 0 || /[\s,.;:!?(\[\]\-+=→]/.test(normalized[i - 1]);
    if (isWordStart) {
      const remaining = normalized.slice(i);
      // Look for a chemical word token: optional coefficient + uppercase letter + symbols
      const wordMatch = /^(\d+)?[A-Z][A-Za-z0-9^+-]*/.exec(remaining);
      if (wordMatch) {
        let word = wordMatch[0];
        let trailingPunct = '';
        if (/[.,;:!?]$/.test(word)) {
          trailingPunct = word.slice(-1);
          word = word.slice(0, -1);
        }

        const chemSegments = parseChemicalFormula(word);
        if (chemSegments && chemSegments.length > 1) {
          flushBuffer();
          segments.push(...chemSegments);
          i += word.length;
          if (trailingPunct) {
            buffer += trailingPunct;
            i += trailingPunct.length;
          }
          continue;
        }
      }
    }

    buffer += normalized[i];
    i++;
  }

  flushBuffer();

  // Combine adjacent plain text segments
  const merged: FormulaSegment[] = [];
  for (const seg of segments) {
    const last = merged[merged.length - 1];
    if (
      last &&
      !last.subscript &&
      !last.superscript &&
      !seg.subscript &&
      !seg.superscript &&
      last.bold === seg.bold
    ) {
      last.text += seg.text;
    } else {
      merged.push({ ...seg });
    }
  }

  return merged;
}

/**
 * Formats math and science strings into clean Unicode text
 * Suitable for markdown outlines, plain text viewers, and labels.
 */
export function formatFormulaToUnicode(rawText: string): string {
  if (!rawText) return '';

  const segments = parseFormulaToSegments(rawText);
  let result = '';

  for (const seg of segments) {
    if (seg.superscript) {
      const converted = seg.text
        .split('')
        .map((ch) => SUPERSCRIPT_MAP[ch] || ch)
        .join('');
      result += converted;
    } else if (seg.subscript) {
      const converted = seg.text
        .split('')
        .map((ch) => SUBSCRIPT_MAP[ch] || ch)
        .join('');
      result += converted;
    } else {
      // Clean up radical syntax like √(16) -> √16 for simple numbers
      const cleanText = seg.text.replace(/√\((\d+|[a-zA-Z])\)/g, '√$1');
      result += cleanText;
    }
  }

  return result;
}
