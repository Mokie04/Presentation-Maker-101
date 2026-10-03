# Math & Science Formula Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement robust, production-grade formula rendering for primary and middle school Math and Science subjects (chemical formulas like $H_2O$ and $CO_2$, exponents like $x^2$, subscripts like $v_0$, square root/radical signs like $\sqrt{16}$, and math operators) across the AI prompt, Web UI, PowerPoint (.pptx), and Markdown (.md) exports.

**Architecture:** Hybrid Universal Formula Engine featuring a dedicated, zero-dependency `formula-parser.ts` utility that transforms LaTeX, caret/underscore, and chemical notations into structured segments (`FormulaSegment[]`). A lightweight React `<FormattedFormula />` component renders semantic `<sup>`/`<sub>`/math typography on the web, while `pptx-generator.ts` emits native PptxGenJS `{ subscript: true }` and `{ superscript: true }` text runs for crisp, editable PowerPoint slides.

**Tech Stack:** TypeScript, Next.js 14, React 18, Tailwind CSS, PptxGenJS, Vitest.

## Global Constraints
- Strict adherence to Karpathy Guidelines: simplicity first, surgical changes, no modifications to unrelated files or existing architecture.
- Red-Green-Refactor TDD methodology: every unit must have failing tests written before implementation.
- Zero client bundle leakage: no API keys or third-party endpoints in client code.
- PowerPoint compatibility: text must remain fully editable native text in PptxGenJS without pixelated rasterization.

---

### Task 1: Formula Parser Engine (`src/lib/utils/formula-parser.ts`)

**Files:**
- Create: `src/lib/utils/formula-parser.ts`
- Test: `tests/lib/utils/formula-parser.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface FormulaSegment {
    text: string;
    subscript?: boolean;
    superscript?: boolean;
    isMath?: boolean;
    bold?: boolean;
  }

  export function parseFormulaToSegments(text: string): FormulaSegment[];
  export function formatFormulaToUnicode(text: string): string;
  ```

- [ ] **Step 1: Write the failing test for formula-parser**
Create `tests/lib/utils/formula-parser.test.ts` testing:
1. Chemical formulas: `H2O` -> `H` + `2` (subscript) + `O`; `CO2`, `C6H12O6`, `Ca2+`.
2. Exponents / carets: `x^2` -> `x` + `2` (superscript); `10^5`, `(a+b)^2`.
3. Subscripts: `x_1` -> `x` + `1` (subscript); `v_0`.
4. LaTeX expressions: `$x^2 + y^2 = r^2$`, `$\sqrt{16} = 4$`, `$\pm 5$`.
5. Radical signs: `sqrt(25)` -> `√(25)`.
6. Chemical reaction arrows: `->` or `-->` -> `→`.
7. `formatFormulaToUnicode` conversion to Unicode super/subscripts and math symbols.

- [ ] **Step 2: Run test to make sure it fails**
Run `npx vitest run tests/lib/utils/formula-parser.test.ts`.

- [ ] **Step 3: Implement `src/lib/utils/formula-parser.ts`**
Write clean, robust parser logic handling tokenization of chemical formulas, LaTeX math expressions, carets, underscores, radicals, and reaction arrows.

- [ ] **Step 4: Run test to make sure it passes**
Run `npx vitest run tests/lib/utils/formula-parser.test.ts`.

- [ ] **Step 5: Commit**
`git add src/lib/utils/formula-parser.ts tests/lib/utils/formula-parser.test.ts && git commit -m "feat(formula): implement formula parser engine for math and science"`

---

### Task 2: AI Slide Generation Prompt Directives

**Files:**
- Modify: `src/lib/prompts/slide-generation.ts`
- Test: `tests/prompts/slide-generation.test.ts`

**Interfaces:**
- Produces: Enhanced `SYSTEM_PROMPT` and `USER_PROMPT_TEMPLATE` with explicit formula formatting directives for Math and Science.

- [ ] **Step 1: Write the failing test**
Update `tests/prompts/slide-generation.test.ts` to assert that formula formatting guidelines (chemical formulas, exponents, radicals, operators) are included in the prompt.

- [ ] **Step 2: Run test to make sure it fails**
Run `npx vitest run tests/prompts/slide-generation.test.ts`.

- [ ] **Step 3: Update `src/lib/prompts/slide-generation.ts`**
Add math/science formula directives to `SYSTEM_PROMPT` and `USER_PROMPT_TEMPLATE` instructing the AI model to format chemical formulas (`H2O`, `CO2`, `2H2 + O2 -> 2H2O`), exponents (`x^2`, `10^5`), and radicals (`sqrt(16)` or `\sqrt{16}`) cleanly.

- [ ] **Step 4: Run test to make sure it passes**
Run `npx vitest run tests/prompts/slide-generation.test.ts`.

- [ ] **Step 5: Commit**
`git add src/lib/prompts/slide-generation.ts tests/prompts/slide-generation.test.ts && git commit -m "feat(prompt): add math and science formula generation directives"`

---

### Task 3: Web UI Formula Rendering Component

**Files:**
- Create: `src/components/FormattedFormula.tsx`
- Modify: `src/components/SlideCard.tsx`
- Modify: `src/components/SlideshowModal.tsx`
- Test: `tests/components/FormattedFormula.test.tsx`

**Interfaces:**
- Produces:
  ```tsx
  export function FormattedFormula({ text, className }: { text: string; className?: string }): JSX.Element;
  ```

- [ ] **Step 1: Write the failing test**
Create `tests/components/FormattedFormula.test.tsx` testing that chemical formulas like `H2O` render with `<sub>2</sub>`, exponents like `x^2` render with `<sup>2</sup>`, and radicals render with `√`.

- [ ] **Step 2: Run test to make sure it fails**
Run `npx vitest run tests/components/FormattedFormula.test.tsx`.

- [ ] **Step 3: Implement `src/components/FormattedFormula.tsx`**
Build the component using `parseFormulaToSegments` and render `<sup>`, `<sub>`, and styled text.

- [ ] **Step 4: Integrate into `SlideCard.tsx` and `SlideshowModal.tsx`**
Replace plain string rendering of bullet points and titles in view mode with `<FormattedFormula text={bullet} />`.

- [ ] **Step 5: Run component tests**
Run `npx vitest run tests/components/`.

- [ ] **Step 6: Commit**
`git add src/components/FormattedFormula.tsx src/components/SlideCard.tsx src/components/SlideshowModal.tsx tests/components/FormattedFormula.test.tsx && git commit -m "feat(ui): render math and science formulas with semantic sub/superscripts"`

---

### Task 4: PowerPoint (.pptx) Native Formula Formatting

**Files:**
- Modify: `src/lib/services/pptx-generator.ts`
- Test: `tests/lib/services/pptx-generator.test.ts`

**Interfaces:**
- Consumes: `parseFormulaToSegments` from `@/lib/utils/formula-parser`
- Produces: Native PptxGenJS runs with `{ subscript: true }`, `{ superscript: true }`, and Unicode math symbols for bullet points and slide titles.

- [ ] **Step 1: Write the failing test**
Update `tests/lib/services/pptx-generator.test.ts` to assert that presentations with chemical formulas and math equations generate valid PowerPoint buffers containing formatted runs.

- [ ] **Step 2: Run test to make sure it fails**
Run `npx vitest run tests/lib/services/pptx-generator.test.ts`.

- [ ] **Step 3: Update `src/lib/services/pptx-generator.ts`**
Transform `slide.contentPoints` into structured PptxGenJS runs using `parseFormulaToSegments`. Maintain paragraph and bullet boundaries (`bullet: true` on the first run of each bullet point, `breakLine: true` between bullets).

- [ ] **Step 4: Run test to make sure it passes**
Run `npx vitest run tests/lib/services/pptx-generator.test.ts`.

- [ ] **Step 5: Commit**
`git add src/lib/services/pptx-generator.ts tests/lib/services/pptx-generator.test.ts && git commit -m "feat(pptx): render native subscript and superscript formula runs in PowerPoint"`

---

### Task 5: Markdown (.md) Formula Formatting

**Files:**
- Modify: `src/lib/services/markdown-generator.ts`
- Test: `tests/lib/services/markdown-generator.test.ts`

**Interfaces:**
- Consumes: `formatFormulaToUnicode` from `@/lib/utils/formula-parser`

- [ ] **Step 1: Write the failing test**
Update `tests/lib/services/markdown-generator.test.ts` asserting that formulas with carets or chemical formulas export clean, standard Unicode symbols (`H₂O`, `x²`, `√16`).

- [ ] **Step 2: Run test to make sure it fails**
Run `npx vitest run tests/lib/services/markdown-generator.test.ts`.

- [ ] **Step 3: Update `src/lib/services/markdown-generator.ts`**
Format slide titles and content points using `formatFormulaToUnicode`.

- [ ] **Step 4: Run test to make sure it passes**
Run `npx vitest run tests/lib/services/markdown-generator.test.ts`.

- [ ] **Step 5: Commit**
`git add src/lib/services/markdown-generator.ts tests/lib/services/markdown-generator.test.ts && git commit -m "feat(markdown): format math and science formulas with Unicode in markdown export"`

---

### Task 6: Full Verification & Production Build

- [ ] **Step 1: Run complete test suite**
Run `npm test` (all 20+ test files, 80+ tests must pass).

- [ ] **Step 2: Run production build**
Run `npm run build` (Next.js production build must compile with zero errors).

- [ ] **Step 3: Push changes to GitHub**
Run `git push origin main`.
