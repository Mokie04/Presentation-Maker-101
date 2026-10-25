import { describe, expect, it } from 'vitest';
import { fitText, fitSlide } from '@/lib/slide-fit';
import type { SlideData } from '@/types/presentation';
const options = { widthIn: 7.333, heightIn: 4.6, baseSizePt: 35, floorPt: 24, lineHeight: 46 / 35 };
const slide: SlideData = { slideNumber: 2, part: 'Discussion', title: 'Water', contentPoints: ['Observe water'], visualDescription: '' };
describe('fitText', () => {
  it('keeps short text at the base size and counts explicit newlines', () => {
    expect(fitText({ ...options, paragraphs: ['Hello\nWorld'] })).toMatchObject({ fontSize: 35, fits: true, lines: 2, lineHeightPt: 46 });
  });
  it('breaks overlong words, and bold wraps earlier than regular', () => {
    const input = { ...options, paragraphs: ['W'.repeat(50)], heightIn: 100, floorPt: 35 };
    expect(fitText(input).lines).toBeGreaterThan(1);
    expect(fitText({ ...options, paragraphs: ['aa'], widthIn: 0.7007, heightIn: 100, floorPt: 35, bold: true }).lines)
      .toBeGreaterThan(fitText({ ...options, paragraphs: ['aa'], widthIn: 0.7007, heightIn: 100, floorPt: 35 }).lines);
  });
  it('shrinks dense text and reports impossible text at the floor', () => {
    expect(fitText({ ...options, paragraphs: ['Observe the different bodies in our Solar System. '.repeat(7)] }).fontSize).toBeLessThan(35);
    expect(fitText({ ...options, paragraphs: ['Evidence '.repeat(1000)] })).toMatchObject({ fontSize: 24, fits: false });
  });
  it('never grows when text is appended', () => {
    let size = 35;
    for (let n = 1; n <= 25; n++) {
      const next = fitText({ ...options, paragraphs: ['Observe evidence '.repeat(n)] }).fontSize;
      expect(next).toBeLessThanOrEqual(size); size = next;
    }
  });
  it('reserves width and height safety margins', () => {
    expect(fitText({ ...options, paragraphs: ['W'], widthIn: 0.45, heightIn: 46 / 72, floorPt: 35 }).fits).toBe(false);
    expect(fitText({ ...options, paragraphs: ['W'.repeat(15)], heightIn: 100, floorPt: 35 }).lines).toBe(2);
  });
  it('supports functional line height and empty paragraphs', () => {
    expect(fitText({ ...options, paragraphs: [], lineHeight: size => size * 1.5 })).toMatchObject({ lines: 0, fits: true, lineHeightPt: 52.5 });
    expect(fitText({ ...options, paragraphs: [''] }).lines).toBe(1);
  });
});
describe('fitSlide', () => {
  it('uses narrower content width for visuals', () => {
    const dense = { ...slide, contentPoints: ['Observe water and record evidence. '.repeat(12)] };
    expect(fitSlide({ ...dense, visualDescription: 'Water' }, 1).body.fontSize).toBeLessThanOrEqual(fitSlide(dense, 1).body.fontSize);
  });
  it('reserves the on-slide editor’s two-em bullet wrapper at each fitted size', () => {
    const current = { ...slide, visualDescription: 'image', contentPoints: ['Observe water and record evidence. '.repeat(5).trim()] };
    expect(fitSlide(current, 1).body.fontSize).toBeLessThan(32);
    expect(fitSlide(current, 1).body.fits).toBe(true);
  });
  it('includes writers once, and uses title layout and per-box floors', () => {
    const dense = { ...slide, title: 'Water '.repeat(500), contentPoints: ['Evidence '.repeat(500)] };
    expect(fitSlide(dense, 1).title.fontSize).toBe(28);
    expect(fitSlide(dense, 1).body.fontSize).toBe(24);
    expect(fitSlide(dense, 0).title.fontSize).toBe(28);
    expect(fitSlide(dense, 0).body.fontSize).toBe(16);
    expect(fitSlide(slide, 0, 'Maria').body.lines).toBeGreaterThan(fitSlide(slide, 0).body.lines);
    expect(fitSlide({ ...slide, contentPoints: ['Writer: Maria'] }, 0, 'Maria')).toEqual(fitSlide({ ...slide, contentPoints: ['Writer: Maria'] }, 0));
  });
});
