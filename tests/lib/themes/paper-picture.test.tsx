// @vitest-environment jsdom
import React from 'react';
import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PAPER_NOTEBOOK } from '@/lib/themes/paper-notebook';
import { DEFAULT_THEME, getTheme, type SlideTheme } from '@/lib/themes';
import { fitSlide } from '@/lib/slide-fit';
import { validateDecorations } from '@/lib/themes/decoration';
import { SlideView } from '@/components/SlideView';
import { decorationSlides } from '../../helpers/test-decorations';
import { lookFixtureImage } from '../../helpers/look-render-fixtures';
import { samples } from '../services/credit-samples';
import { htmlDocument } from '../../helpers/decoration-parity';
const theme: SlideTheme = PAPER_NOTEBOOK;
const deck = { subject: 'Science', topic: 'Water', originalWriters: '', slides: [decorationSlides[0], decorationSlides[1], { ...decorationSlides[1], imageMetadata: samples.commonsFull }, decorationSlides[1]] };
const html = (slide = deck.slides[1], index = 1, image: string | null = lookFixtureImage, look = theme) => htmlDocument(renderToStaticMarkup(<SlideView slide={slide} index={index} total={4} image={image ?? undefined} theme={look} />));
it('defines the approved polaroid, tape, 2-degree content picture rotation and smaller picture-only layout', () => {
  expect(theme.shape).toMatchObject({ pictureRotation: 2, visualCornerRadius: '0%' });
  expect(theme.decorations!.filter(d => d.kind === 'rect')).toEqual([
    expect.objectContaining({ layer: 'behind', rotate: 2, when: { slide: 'content', needsVisual: true }, fill: { color: 'FFFFFF' }, shadow: expect.objectContaining({ type: 'outer' }) }),
    expect.objectContaining({ layer: 'front', when: { slide: 'content', needsVisual: true }, fill: { color: 'F5D76E', transparency: 35 } }),
  ]);
  expect(validateDecorations(theme)).toEqual([]);
  expect(theme.layout.title).toBe(DEFAULT_THEME.layout.title);
  expect(theme.layout.credit).toBe(DEFAULT_THEME.layout.credit); expect(theme.layout.counter).toBe(DEFAULT_THEME.layout.counter);
  const pictureEntries = ['image', 'libraryImage', 'imageSizing', 'placeholder', 'visualCard'];
  for (const [key, value] of Object.entries(DEFAULT_THEME.layout.content)) {
    if (!pictureEntries.includes(key)) expect(theme.layout.content[key as keyof typeof theme.layout.content]).toEqual(value);
  }
  for (const [index, slide] of Array.from(deck.slides.entries())) expect(fitSlide(slide, index, '', theme)).toEqual(fitSlide(slide, index, '', { ...theme, layout: DEFAULT_THEME.layout }));
});
it('keeps every rotated picture/card/placeholder box clear of bullets, counter and credits', () => {
  const inch = (value: number | string, dimension: number) => typeof value === 'number' ? value : parseFloat(value) * dimension / 100;
  const angle = 2 * Math.PI / 180;
  for (const box of [theme.layout.content.image, theme.layout.content.libraryImage, theme.layout.content.visualCard, theme.layout.content.placeholder]) {
    const x = inch(box.x, 13.333), y = inch(box.y, 7.5), w = inch(box.w, 13.333), h = inch(box.h, 7.5);
    const rw = w * Math.cos(angle) + h * Math.sin(angle), rh = w * Math.sin(angle) + h * Math.cos(angle);
    expect(x + w / 2 - rw / 2).toBeGreaterThan(0.8 + 13.333 * 0.55);
    expect(y + h / 2 + rh / 2).toBeLessThan(6.85);
  }
});
it('rotates actual image and missing-picture card/text in the browser preview', () => {
  for (const index of [1, 2, 3]) {
    const document = html(deck.slides[index], index, index === 3 ? null : lookFixtureImage);
    const content = document.querySelector('[role="group"]')!;
    const rotated = Array.from(content.children).filter(e => (e as HTMLElement).style.transform === 'rotate(2deg)');
    expect(rotated).toHaveLength(2);
    for (const element of rotated) expect((element as HTMLElement).style.transformOrigin).toBe('50% 50%');
  }
});
it('leaves title-slide pictures unrotated and Classic/Chalkboard zero or absent rotation markup unchanged', () => {
  const slide = { ...deck.slides[0], imageMetadata: samples.commonsFull };
  expect(html(slide, 0).querySelector('img')!.style.transform).toBe('');
  for (const id of ['sayuna-classic', 'chalkboard']) {
    const look = getTheme(id), zero = { ...look, shape: { ...look.shape, pictureRotation: 0 } };
    expect(html(deck.slides[1], 1, lookFixtureImage, zero).body.innerHTML).toBe(html(deck.slides[1], 1, lookFixtureImage, look).body.innerHTML);
  }
});
