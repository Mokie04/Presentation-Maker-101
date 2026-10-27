import React from 'react';
import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import JSZip from 'jszip';
import { NextRequest } from 'next/server';
import { DEFAULT_THEME, THEMES, getTheme } from '@/lib/themes';
import { getFontMetrics } from '@/lib/slide-fit-metrics-registry';
import { fitSlide } from '@/lib/slide-fit';
import { autoFitDeck } from '@/lib/auto-fit-deck';
import { SlideView } from '@/components/SlideView';
import { buildPresentationPptx, createPresentationPptx } from '@/lib/services/pptx-generator';
import { POST } from '@/app/api/download-pptx/route';
import { samples } from '../services/credit-samples';
const slide = { slideNumber: 1, part: 'Discussion', title: 'Water and evidence', contentPoints: ['Compare evidence in the classroom. '.repeat(4), 'Record your observations. '.repeat(4)], visualDescription: 'Water diagram', imageMetadata: samples.commonsFull };
const deck = { subject: 'Science', topic: 'Water', originalWriters: 'Teacher', slides: [slide, slide] };
afterEach(() => vi.useRealTimers());

it('registers exactly the approved looks with unique IDs, real metrics and available font variables', () => {
  expect(THEMES.map(t => t.id)).toEqual(['sayuna-classic', 'chalkboard', 'paper-notebook']);
  expect(new Set(THEMES.map(t => t.id)).size).toBe(THEMES.length);
  const fonts = readFileSync('src/lib/fonts.ts', 'utf8');
  for (const theme of THEMES) {
    expect(theme.typography.exportFace).toBeTruthy();
    expect(getFontMetrics(theme.typography.metricsId)).toBeTruthy();
    const variable = theme.typography.previewFont.match(/var\(([^)]+)\)/)![1];
    expect(fonts).toContain(variable);
  }
});
it.each([['chalkboard', 'Arial', 'arimo', '22302C'], ['paper-notebook', 'Georgia', 'gelasio', 'FBF6E9']])('renders %s with its palette, font stack and preserved text geometry', (id, face, metrics, background) => {
  const theme = getTheme(id);
  expect(theme.id).toBe(id); expect(theme.typography.exportFace).toBe(face); expect(theme.typography.metricsId).toBe(metrics);
  if (id === 'chalkboard') { expect(theme.shape).toBe(DEFAULT_THEME.shape); expect(theme.layout).toBe(DEFAULT_THEME.layout); }
  else { expect(theme.layout.title).toBe(DEFAULT_THEME.layout.title); expect(theme.layout.content.bullets).toBe(DEFAULT_THEME.layout.content.bullets); }
  const html = renderToStaticMarkup(<SlideView slide={slide} index={1} total={2} theme={theme} />);
  expect(html).toContain(`background-color:#${background}`);
  expect(html).toContain(theme.typography.previewFont.replaceAll("'", '&#x27;'));
  for (const color of [theme.palette.primary, theme.palette.secondary, theme.palette.muted, theme.palette.subtle, theme.palette.cardBorder]) expect(html).toContain(`#${color}`);
});
it.each(['arimo', 'gelasio'])('covers the classroom character set with sane %s metrics', id => {
  const metrics = getFontMetrics(id);
  const baseline = getFontMetrics('poppins');
  for (const weight of ['regular', 'bold'] as const) {
    expect(Object.keys(metrics[weight].widths)).toEqual(Object.keys(baseline[weight].widths));
    expect(metrics[weight].fallback).toBeGreaterThan(200); expect(metrics[weight].fallback).toBeLessThan(900);
    expect(metrics[weight].lineHeight).toBeGreaterThan(1); expect(metrics[weight].lineHeight).toBeLessThan(2);
    for (const width of Object.values(metrics[weight].widths)) expect(width).toBeGreaterThan(0);
  }
});
it.each(['chalkboard', 'paper-notebook'])('exports %s with Office theme fonts and readable completed-package links and theme fonts through both entry points', async id => {
  const theme = getTheme(id);
  const completed = await buildPresentationPptx(deck, undefined, theme);
  for (const buffer of [completed, await createPresentationPptx(deck, undefined, theme).write({ outputType: 'nodebuffer' })]) {
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file('ppt/slides/slide2.xml')!.async('string');
    expect(xml).toContain(`typeface="${theme.typography.exportFace}"`);
    expect(xml).toContain(theme.palette.background);
    const themeXml = await zip.file('ppt/theme/theme1.xml')!.async('string');
    expect(themeXml).toContain(`<a:majorFont><a:latin typeface="${theme.typography.exportFace}"`);
    expect(themeXml).toContain(`<a:minorFont><a:latin typeface="${theme.typography.exportFace}"`);
    if (buffer === completed) expect(themeXml).toContain(`<a:hlink><a:srgbClr val="${theme.palette.muted}"/></a:hlink>`);
    if (buffer === completed) expect(themeXml).toContain(`<a:folHlink><a:srgbClr val="${theme.palette.muted}"/></a:folHlink>`);
  }
  const response = await POST(new NextRequest('http://localhost/api/download-pptx', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ presentationData: deck, themeId: id }) }));
  expect(response.status).toBe(200);
  const zip = await JSZip.loadAsync(await response.arrayBuffer());
  expect(await zip.file('ppt/slides/slide2.xml')!.async('string')).toContain(`typeface="${theme.typography.exportFace}"`);
});
it('uses narrower metrics to gain body fit without changing generation-time Classic auto-fit', () => {
  const bullet = 'Identify the different kinds of small bodies in the Solar System like meteoroids, asteroids, and dwarf planets.';
  const input = { ...deck, slides: [{ ...slide, title: 'Space', contentPoints: ['Grade 7'], visualDescription: '', imageMetadata: undefined }, { ...slide, title: 'Bodies', contentPoints: Array.from({ length: 24 }, (_, i) => `${i + 1}. ${bullet}`) }] };
  const inputs = [input,
    { ...input, slides: [input.slides[0], { ...input.slides[1], contentPoints: Array.from({ length: 8 }, () => bullet) }] },
    { ...input, slides: [input.slides[0], { ...input.slides[1], part: 'Assessment', contentPoints: Array.from({ length: 18 }, (_, i) => `${i + 1}. Compare H_2O, CO2, x^2 and 2H2 + O2 -> 2H2O. ${bullet}`) }] },
  ];
  const fittedDecks = inputs.map(value => autoFitDeck(value));
  fittedDecks.forEach((value, index) => expect(value).toEqual(autoFitDeck(inputs[index], DEFAULT_THEME)));
  const report = ['chalkboard', 'paper-notebook'].map(id => {
    let slack = 0; let titleSlack = 0;
    fittedDecks.forEach(fitted => fitted.slides.forEach((s, index) => {
      const classic = fitSlide(s, index, fitted.originalWriters);
      const next = fitSlide(s, index, fitted.originalWriters, getTheme(id));
      expect(next.title.fits).toBe(true); expect(next.body.fits).toBe(true);
      if (next.title.lineHeightPt * next.title.lines < classic.title.lineHeightPt * classic.title.lines) titleSlack++;
      if (next.body.fontSize > classic.body.fontSize || next.body.lines < classic.body.lines) slack++;
    }));

    expect(titleSlack).toBeGreaterThan(0);
    expect(fitSlide(slide, 1, undefined, getTheme(id))).not.toEqual(fitSlide(slide, 1));
    return { id, slides: fittedDecks.reduce((sum, value) => sum + value.slides.length, 0), gainedBodySlack: slack, gainedTitleSlack: titleSlack };
  });
  console.info('New look dense-fit evidence:', report);
});
it.each(['chalkboard', 'paper-notebook'])('uses measured title line height for %s instead of inherited Poppins leading', id => {
  const theme = getTheme(id);
  const long = { ...slide, title: 'Investigating H_2O and x^2 in the classroom with evidence from our observations' };
  const fit = fitSlide(long, 1, undefined, theme);
  expect(fit.title.lines).toBeGreaterThan(1);
  expect(fit.title.fits).toBe(true);
  const html = renderToStaticMarkup(<SlideView slide={long} index={1} total={2} theme={theme} />);
  const style = html.match(/<h2[^>]*style="([^"]+)"/)![1];
  expect(style).toContain(`line-height:${fit.title.lineHeightPt / 960 * 100}cqw`);
});

it.each(['chalkboard', 'paper-notebook'])('uses narrower body advances for %s on the same wrapping stress slide', id => {
  const stress = { ...slide, contentPoints: ['minimum '.repeat(40)] };
  const classic = fitSlide(stress, 1).body;
  const next = fitSlide(stress, 1, undefined, getTheme(id)).body;
  expect(next.fontSize > classic.fontSize || next.lines < classic.lines).toBe(true);
});
