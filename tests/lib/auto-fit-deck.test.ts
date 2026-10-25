import { describe, expect, it } from 'vitest';
import { autoFitDeck } from '@/lib/auto-fit-deck';
import { fitSlide } from '@/lib/slide-fit';
import { samples } from './services/credit-samples';
import type { PresentationData, SlideData } from '@/types/presentation';
const bullet = 'Identify the different kinds of small bodies in the Solar System like meteoroids, asteroids, and dwarf planets.';
const title: SlideData = { slideNumber: 1, part: 'Title Page', title: 'Space', contentPoints: ['Grade 7'], visualDescription: '' };
function deck(points: string[] = ['Observe'], changes: Partial<SlideData> = {}): PresentationData {
  return { subject: 'Science', originalWriters: 'Teacher Maria', topic: 'Space', subjectEvidence: [{ subject: 'Science', source: 'teacher-supplied' }],
    slides: [title, { slideNumber: 2, part: 'Discussion', title: 'Bodies', contentPoints: points, visualDescription: 'Solar System', ...changes }] };
}
describe('autoFitDeck', () => {
  it('returns the exact input when a deck already fits, including no slides', () => {
    const input = deck(); expect(autoFitDeck(input)).toBe(input);
    const empty = { ...input, slides: [] }; expect(autoFitDeck(empty)).toBe(empty);
  });
  it('splits until each body fits, preserving ordered text, metadata and the first slide', () => {
    const input = deck(Array.from({ length: 24 }, (_, i) => `${i + 1}. ${bullet}`));
    const before = structuredClone(input);
    const result = autoFitDeck(input);
    expect(result.slides.length).toBeGreaterThan(3);
    expect(result.slides[0]).toBe(input.slides[0]);
    expect(result.slides.slice(1).flatMap(s => s.contentPoints)).toEqual(input.slides[1].contentPoints);
    expect(result.slides.map(s => s.slideNumber)).toEqual(result.slides.map((_, i) => i + 1));
    for (let i = 1; i < result.slides.length; i++) {
      expect(fitSlide(result.slides[i], i, result.originalWriters).body.fits).toBe(true);
      expect(result.slides[i].part).toBe('Discussion');
      if (i > 1) { expect(result.slides[i].visualDescription).toBe(''); expect(result.slides[i].imageMetadata).toBeUndefined(); }
    }
    expect(result.slides[2].title).toBe('Bodies (cont.)'); expect(result.slides[3].title).toBe('Bodies (cont. 2)');
    expect(result.subject).toBe(input.subject); expect(result.originalWriters).toBe(input.originalWriters);
    expect(result.topic).toBe(input.topic); expect(result.subjectEvidence).toBe(input.subjectEvidence);
    expect(input).toEqual(before);
    expect(autoFitDeck(result)).toBe(result);
  });
  it('keeps original credit only on the first piece', () => {
    const input = deck(Array.from({ length: 8 }, () => bullet), { imageMetadata: samples.commonsFull });
    const result = autoFitDeck(input);
    expect(result.slides.length).toBeGreaterThan(2);
    expect(result.slides[1].imageMetadata).toBe(samples.commonsFull);
    expect(result.slides.slice(2).every(slide => slide.imageMetadata === undefined)).toBe(true);
  });
  it('never splits the first slide, a lone long bullet, or title-only overflow', () => {
    const input = deck(['Evidence '.repeat(1000)]);
    input.slides[0] = { ...title, contentPoints: Array.from({ length: 20 }, () => bullet) };
    expect(autoFitDeck(input)).toBe(input);
    const titleOverflow = deck(['Observe'], { title: 'A very long title '.repeat(100) });
    expect(autoFitDeck(titleOverflow)).toBe(titleOverflow);
  });
  it('keeps exactly 20 completed splits, but rolls back an original needing more', () => {
    const long = 'Evidence\n'.repeat(12);
    const boundary = deck(Array.from({ length: 21 }, () => long));
    const fitted = autoFitDeck(boundary);
    expect(fitted.slides).toHaveLength(22);
    expect(fitted.slides.slice(1).every(s => s.contentPoints.length === 1)).toBe(true);
    expect(autoFitDeck(fitted)).toBe(fitted);
    const capped = deck(Array.from({ length: 22 }, () => long));
    expect(autoFitDeck(capped)).toBe(capped);
    expect(autoFitDeck(autoFitDeck(capped))).toBe(capped);
  });
  it('leaves a capped original intact while fitting other original slides independently', () => {
    const input = deck(Array.from({ length: 22 }, () => 'Evidence\n'.repeat(12)));
    input.slides.push({ ...input.slides[1], slideNumber: 3, title: 'Next', contentPoints: Array.from({ length: 12 }, () => bullet) });
    const result = autoFitDeck(input);
    expect(result.slides[1]).toBe(input.slides[1]);
    expect(result.slides.length).toBeGreaterThan(3);
    expect(result.slides.slice(2).flatMap(s => s.contentPoints)).toEqual(input.slides[2].contentPoints);
    expect(autoFitDeck(result)).toBe(result);
  });
  it('retains every formula and part while inserting continuations before the next original', () => {
    const formulas = Array.from({ length: 18 }, (_, i) => `${i + 1}. Compare H_2O, CO2, x^2 and 2H2 + O2 -> 2H2O. ${bullet}`);
    const input = deck(formulas, { part: 'Assessment' });
    input.slides.push({ ...title, slideNumber: 3, part: 'Activities', title: 'Next', contentPoints: ['Work together'] });
    const result = autoFitDeck(input);
    expect(result.slides.slice(1, -1).flatMap(s => s.contentPoints)).toEqual(formulas);
    expect(result.slides.slice(1, -1).every(s => s.part === 'Assessment')).toBe(true);
    expect(result.slides.at(-1)).toMatchObject({ title: 'Next', part: 'Activities', contentPoints: ['Work together'] });
  });
});
