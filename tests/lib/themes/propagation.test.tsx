import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import JSZip from 'jszip';
import { DEFAULT_THEME, type SlideTheme } from '@/lib/themes';
import { fitSlide, fitText, getSlideOverflow } from '@/lib/slide-fit';
import { suggestSplitIndex } from '@/lib/slide-split';
import { autoFitDeck } from '@/lib/auto-fit-deck';
import { createPresentationPptx, buildPresentationPptx } from '@/lib/services/pptx-generator';
import { SlideView } from '@/components/SlideView';
import { EditableSlideView } from '@/components/workspace/EditableSlideView';
import type { PresentationData } from '@/types/presentation';
vi.mock('next/font/local', () => ({ default: () => ({ variable: 'poppins-variable' }) }));

const deck: PresentationData = { subject: 'Science', topic: 'Water', originalWriters: 'Teacher Maria', slides: [
  { slideNumber: 1, part: 'Title Page', title: 'Water', contentPoints: ['Grade 7'], visualDescription: '' },
  { slideNumber: 2, part: 'Discussion', title: 'Observe water', contentPoints: Array.from({ length: 8 }, () => 'Observe water and compare the evidence in your classroom.'), visualDescription: 'Water diagram' },
] };
const custom: SlideTheme = { ...DEFAULT_THEME, id: 'test', name: 'Test theme',
  palette: { background: 'FFFFFF', primary: '112233', secondary: '223344', textDark: '334455', heading: '445566', muted: '556677', subtle: '667788', cardBackground: 'EEEEEE', cardBorder: '778899' },
  typography: { exportFace: 'Arial', previewFont: 'Arial, sans-serif', metricsId: 'poppins' },
  shape: { visualBorderWidth: 3, visualCornerRadius: '10%' },
  layout: { ...DEFAULT_THEME.layout,
    content: { ...DEFAULT_THEME.layout.content, bullets: { ...DEFAULT_THEME.layout.content.bullets, h: 0.5, x: 1.2, fontSize: 30 } },
    title: { ...DEFAULT_THEME.layout.title, pointFontSize: 18 },
  },
};

describe('theme propagation', () => {
  it('keeps explicit Classic fitting, overflow, splitting and auto-fit identical to omitted themes', () => {
    deck.slides.forEach((slide, index) => {
      expect(fitSlide(slide, index, deck.originalWriters, DEFAULT_THEME)).toEqual(fitSlide(slide, index, deck.originalWriters));
      expect(getSlideOverflow(slide, index, deck.originalWriters, DEFAULT_THEME)).toEqual(getSlideOverflow(slide, index, deck.originalWriters));
      expect(suggestSplitIndex(slide, index, deck.originalWriters, DEFAULT_THEME)).toEqual(suggestSplitIndex(slide, index, deck.originalWriters));
    });
    expect(autoFitDeck(deck, DEFAULT_THEME)).toEqual(autoFitDeck(deck));
  });

  it('passes a custom layout through fitting, splitting and auto-fit', () => {
    const slide = deck.slides[1];
    expect(fitSlide(slide, 1, undefined, custom).body).not.toEqual(fitSlide(slide, 1).body);
    expect(getSlideOverflow(slide, 1, undefined, custom).body).toBe(true);
    expect(suggestSplitIndex(slide, 1, undefined, custom)).toBe(1);
    expect(autoFitDeck(deck, custom).slides.length).toBeGreaterThan(autoFitDeck(deck).slides.length);
    expect(() => fitText({ paragraphs: ['Water'], widthIn: 4, heightIn: 2, baseSizePt: 30, floorPt: 24, lineHeight: 1.5 },
      { ...custom, typography: { ...custom.typography, metricsId: 'missing' } })).toThrow('Unknown slide fit metrics: missing');
  });

  it('keeps explicit Classic markup identical and renders custom colours, font, shape and geometry', () => {
    for (const [index, slide] of Array.from(deck.slides.entries())) {
      const props = { slide, index, total: 2, originalWriters: deck.originalWriters };
      expect(renderToStaticMarkup(<SlideView {...props} theme={DEFAULT_THEME} />)).toBe(renderToStaticMarkup(<SlideView {...props} />));
    }
    const markup = renderToStaticMarkup(<SlideView slide={deck.slides[1]} index={1} total={2} theme={custom} />);
    expect(markup).toContain('background-color:#FFFFFF');
    expect(markup).toContain('font-family:Arial, sans-serif');
    expect(markup).toContain('color:#112233');
    expect(markup).toContain('border-radius:10%');
    const handlers = { onTitleChange: vi.fn(), onPointChange: vi.fn(), onPointInsert: vi.fn(), onPointDelete: vi.fn(), onPointAdd: vi.fn() };
    const editable = renderToStaticMarkup(<EditableSlideView slide={{ ...deck.slides[1], contentPoints: [] }} index={1} total={2} theme={custom} {...handlers} />);
    expect(editable).toContain(`left:${1.2 / 13.333 * 100}%`);
    expect(editable).toContain('Click to add a bullet');
  });

  it('passes the theme through both PPTX entry points and preserves explicit Classic XML', async () => {
    const xml = async (buffer: Buffer | string | ArrayBuffer | Uint8Array) => (await JSZip.loadAsync(buffer)).file('ppt/slides/slide2.xml')!.async('string');
    expect(await xml(await buildPresentationPptx(deck, undefined, DEFAULT_THEME))).toBe(await xml(await buildPresentationPptx(deck)));
    const direct = await createPresentationPptx(deck, undefined, custom).write({ outputType: 'nodebuffer' });
    const themed = await xml(await buildPresentationPptx(deck, undefined, custom));
    expect(themed).toBe(await xml(direct as Buffer));
    for (const hex of ['FFFFFF', '112233', '223344', '334455', '667788', 'EEEEEE', '778899']) expect(themed).toContain(hex);
    expect(themed).toContain('typeface="Arial"');
    expect(themed).toContain('<a:gd name="adj" fmla="val 10000"/>');
  });
});
