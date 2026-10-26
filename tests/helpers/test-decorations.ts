import { getTheme, type SlideTheme } from '@/lib/themes';
import type { Decoration } from '@/lib/themes/decoration';

export const TEST_DECORATIONS = [
  { kind: 'rect', x: 0.12, y: 0.12, w: 0.35, h: 0.25, rotate: 12, layer: 'behind', when: { slide: 'any' },
    fill: { color: '40655A', transparency: 30 }, line: { color: '9EE6C9', width: 1.2, dash: 'dash' },
    shadow: { type: 'outer', color: '000000', opacity: 0.2, blur: 2, offset: 1, angle: 45 } },
  { kind: 'roundRect', x: 9, y: 3, w: 1, h: 0.6, radius: 0.15, layer: 'front', when: { slide: 'content', needsVisual: true },
    fill: { color: '40655A', transparency: 20 }, line: { color: 'FFD966', width: 2, dash: 'dash' } },
  { kind: 'ellipse', x: 0.15, y: 3.6, w: 0.3, h: 0.35, layer: 'behind', when: { slide: 'any' },
    fill: { color: '9EE6C9' }, line: { color: 'FFD966', width: 0.75 } },
  { kind: 'line', x: 0.8, y: 2.9, w: 11, h: 0, layer: 'behind', when: { slide: 'content' },
    line: { color: '2E403B', width: 0.75, dash: 'dash' } },
  { kind: 'path', x: 5, y: 0.1, w: 2, h: 0.24, rotate: -4, layer: 'behind', when: { slide: 'any' },
    fill: { color: 'FFD966', transparency: 25 }, line: { color: '9EE6C9', width: 1 }, points: [
      { kind: 'moveTo', x: 0, y: 0.12 }, { kind: 'line', x: 0.1, y: 0.12 }, { kind: 'quadratic', x: 0.7, y: 0.1, cx: 0.3, cy: 0 },
      { kind: 'cubic', x: 2, y: 0.12, cx1: 1, cy1: 0.24, cx2: 1.5, cy2: 0 }, { kind: 'close' },
    ] },
  { kind: 'line', x: 8.6, y: 5.8, w: 1.2, h: -0.9, layer: 'front', when: { slide: 'content', needsVisual: true },
    line: { color: '9EE6C9', width: 2 } },
  { kind: 'rect', x: 0.25, y: 0.6, w: 0.25, h: 0.2, layer: 'front', when: { slide: 'title' },
    fill: { color: 'FFD966' } },
  { kind: 'roundRect', x: 12.7, y: 0.1, w: 0.3, h: 0.2, radius: 0, layer: 'behind', when: { slide: 'any' },
    line: { color: 'FFD966', width: 1 }, shadow: { type: 'outer', color: '000000', opacity: 0, blur: 0, offset: 0, angle: 0 } },
] as const satisfies readonly Decoration[];

export const TEST_DECORATION_THEME: SlideTheme = { ...getTheme('chalkboard'), id: 'test-decorations', name: 'Test decorations', decorations: TEST_DECORATIONS };
export const decorationSlides = [
  { slideNumber: 1, title: 'Water and energy', part: 'Title Page', contentPoints: ['Grade 7 Science'], visualDescription: '' },
  { slideNumber: 2, title: 'Observe water', part: 'Discussion', contentPoints: ['Compare water and ice', 'Record the evidence'], visualDescription: 'Water diagram' },
  { slideNumber: 3, title: 'Share evidence', part: 'Discussion', contentPoints: ['Discuss your findings'], visualDescription: '' },
];
