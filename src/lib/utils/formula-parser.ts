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

  // Currency is literal; only unwrap content with explicit math syntax or one variable.
  text = text.replace(/(\${1,2})([^$]+)\1/g, (match, _delimiter: string, content: string) =>
    /[\\^_{}=]/.test(content) || /^[A-Za-z]$/.test(content.trim()) ? content : match
  );

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
const ELEMENT_SYMBOLS = new Set((
  'H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn ' +
  'Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce ' +
  'Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn ' +
  'Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og'
).split(' '));

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

  // Consume the entire token; never recover valid-looking pieces from ordinary words.
  while (rem.length > 0) {
    const element = /^([A-Z][a-z]?)(\d*)/.exec(rem);
    if (!element || !ELEMENT_SYMBOLS.has(element[1])) return null;
    tokens.push({ text: element[1] });
    if (element[2]) tokens.push({ text: element[2], subscript: true });
    rem = rem.slice(element[0].length);
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
  if (!rawText) {
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
    const marker = normalized[i];
    // A prose identifier is not a variable: teacher_name stays literal.
    const subscriptBase = marker === '_' && /(?:^|[^A-Za-z0-9_])[A-Za-z]$|[0-9)\]}]$/.test(normalized.slice(0, i));
    const inEmail = marker === '_' && (
      /@\S*$/.test(normalized.slice(0, i)) || /^\S*@/.test(normalized.slice(i + 1))
    );
    if (marker === '^' || (marker === '_' && subscriptBase && !inEmail)) {
      const remainder = normalized.slice(i + 1);
      const script = /^(?:\{([^{}]+)\}|\(([^()]+)\))/.exec(remainder);
      const unbraced = (marker === '^' ? /^[+-]?\d+|^[A-Za-z]/ : /^\d+|^[A-Za-z]/).exec(remainder);
      const scriptText = script ? script[1] ?? script[2] : unbraced?.[0];
      if (scriptText) {
        flushBuffer();
        segments.push({ text: scriptText, ...(marker === '^' ? { superscript: true } : { subscript: true }) });
        i += 1 + (script?.[0].length ?? unbraced![0].length);
        continue;
      }
    }

    // Check for word boundary to identify chemical formulas (e.g. H2O, 2H2, CO2, C6H12O6, Ca2+, Cl-)
    const isWordStart = i === 0 || /[\s,;:!?(\[\]+=→]/.test(normalized[i - 1]);
    if (isWordStart) {
      const remaining = normalized.slice(i);
      // Look for a chemical word token: optional coefficient + uppercase letter + symbols
      const wordMatch = /^(\d+)?[A-Z][A-Za-z0-9^+_.@-]*/.exec(remaining);
      if (wordMatch) {
        // A final period is sentence punctuation; internal dots/@/_ belong to the token.
        const word = wordMatch[0].replace(/\.+$/, '');

        const chemSegments = parseChemicalFormula(word);
        if (chemSegments && chemSegments.length > 1) {
          flushBuffer();
          segments.push(...chemSegments);
          i += word.length;
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
    if (seg.superscript || seg.subscript) {
      const map = seg.superscript ? SUPERSCRIPT_MAP : SUBSCRIPT_MAP;
      const characters = Array.from(seg.text);
      if (characters.every(character => map[character])) {
        result += characters.map(character => map[character]).join('');
      } else {
        const marker = seg.superscript ? '^' : '_';
        result += marker + (characters.length === 1 ? seg.text : `{${seg.text}}`);
      }
    } else {
      // Clean up radical syntax like √(16) -> √16 for simple numbers
      const cleanText = seg.text.replace(/√\((\d+|[a-zA-Z])\)/g, '√$1');
      result += cleanText;
    }
  }

  return result;
}
