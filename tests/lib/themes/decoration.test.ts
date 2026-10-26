import { expect, it } from 'vitest';
import { THEMES, getTheme, type SlideTheme } from '@/lib/themes';
import { decorationsForSlide, validateDecorations, type Decoration } from '@/lib/themes/decoration';
import { TEST_DECORATION_THEME, TEST_DECORATIONS, decorationSlides } from '../../helpers/test-decorations';
const theme = getTheme('chalkboard');
const candidate = (changes: Partial<Decoration> = {}): Decoration => ({ kind: 'rect', x: 0.1, y: 0.1, w: 0.2, h: 0.2,
  layer: 'behind', when: { slide: 'any' }, fill: { color: 'FFFFFF' }, ...changes } as Decoration);
const problems = (decoration: Decoration) => validateDecorations({ ...theme, decorations: [decoration] });
it('accepts every production list and the unregistered fixture', () => {
  for (const look of THEMES as readonly SlideTheme[]) { if (look.id !== 'chalkboard') expect(look.decorations).toBeUndefined(); expect(validateDecorations(look)).toEqual([]); }
  expect(validateDecorations(TEST_DECORATION_THEME)).toEqual([]);
});
it('filters by title/content and content picture area without treating a title image as a content visual', () => {
  expect(decorationsForSlide(TEST_DECORATION_THEME, decorationSlides[0], 0, 'front')).toEqual([TEST_DECORATIONS[6]]);
  expect(decorationsForSlide(TEST_DECORATION_THEME, decorationSlides[1], 1, 'front')).toEqual([TEST_DECORATIONS[1], TEST_DECORATIONS[5]]);
  expect(decorationsForSlide(TEST_DECORATION_THEME, decorationSlides[2], 2, 'front')).toEqual([]);
  expect(decorationsForSlide(TEST_DECORATION_THEME, { ...decorationSlides[0], visualDescription: 'picture' }, 0, 'front')).toEqual([TEST_DECORATIONS[6]]);
});
it.each(['behind', 'front'] as const)('protects credit and counter boxes from %s paint', layer => {
  expect(problems(candidate({ x: 1, y: 7.2, layer })).join(' ')).toContain('credit');
  expect(problems(candidate({ x: 11, y: 6.9, layer })).join(' ')).toContain('counter');
});
it('rejects front text coverage and allows the picture-only front fixture', () => {
  expect(problems(candidate({ x: 1, y: 1.1, layer: 'front' })).join(' ')).toContain('text');
  expect(problems(TEST_DECORATIONS[1])).toEqual([]);
});
it('composites behind paint and checks every applicable text colour, including title points', () => {
  expect(problems(candidate({ x: 1, y: 3.8, fill: { color: 'FFFFFF' } })).join(' ')).toContain('contrast');
  expect(problems(candidate({ x: 1, y: 3.8, fill: { color: 'FFFFFF', transparency: 99 } }))).toEqual([]);
  expect(problems(candidate({ x: 1, y: 1.1, fill: { color: '000000' } }))).toEqual([]);
});
it('accounts for outline interiors, stroke thickness, rotation and shadow extent', () => {
  expect(problems(candidate({ x: 0.1, y: 0.1, w: 13.1, h: 7.38, fill: undefined, line: { color: 'FFFFFF', width: 1 } }))).toEqual([]);
  expect(problems(candidate({ x: 1, y: 7, h: 0.02, fill: undefined, line: { color: 'FFFFFF', width: 30 } })).join(' ')).toContain('credit');
  expect(problems(candidate({ x: 0.3, y: 1, w: 0.2, h: 1, rotate: 90, layer: 'front' })).join(' ')).toContain('text');
  expect(problems(candidate({ x: 1, y: 6.6, shadow: { type: 'outer', color: '000000', opacity: 1, blur: 3, offset: 36, angle: 90 } })).join(' ')).toContain('credit');
});
it.each([
  { x: NaN }, { rotate: Infinity }, { fill: { color: '#FFFFFF' } }, { fill: { color: 'FFFFFG' } },
  { fill: { color: 'FFFFFF', transparency: 101 } }, { line: { color: 'FFFFFF', width: -1 } },
  { line: { color: 'FFFFFF', width: 1, dash: 'dot' } },
  { shadow: { type: 'inner', color: '000000', opacity: 0.5, blur: 2, offset: 2, angle: 45 } },
  { shadow: { type: 'outer', color: '000000', opacity: 1.1, blur: 2, offset: 2, angle: 45 } },
])('reports malformed runtime input %j', changes => {
  expect(problems(candidate(changes as unknown as Partial<Decoration>)).length).toBeGreaterThan(0);
});
it('validates path commands and radius bounds rather than emitting malformed geometry', () => {
  expect(problems(candidate({ kind: 'roundRect', radius: 1 } as Partial<Decoration>)).length).toBeGreaterThan(0);
  expect(problems({ ...TEST_DECORATIONS[4], points: [{ kind: 'line', x: 0, y: 0 }] }).length).toBeGreaterThan(0);
});
// Compile-time guard: shadow type cannot express the library's broken variant.
const forbidden: NonNullable<Decoration['shadow']> = {
  // @ts-expect-error Inner shadows are not part of the engine contract.
  type: 'inner', color: '000000', opacity: 0.5, blur: 2, offset: 2, angle: 45,
};
void forbidden;
void (theme satisfies SlideTheme);

it('protects the credit box from acute path miter joins beyond the segment stroke bounds', () => {
  expect(problems({ kind: 'path', x: 2, y: 6.87, w: 0.2, h: 0.2, layer: 'front', when: { slide: 'content' },
    line: { color: 'FFFFFF', width: 7.2 }, points: [{ kind: 'moveTo', x: 0, y: 0 }, { kind: 'line', x: 0.1, y: 0.2 }, { kind: 'line', x: 0.2, y: 0 }] }).join(' ')).toContain('credit');
});
