// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { SlideshowModal } from '@/components/SlideshowModal';
import type { ImageMetadata } from '@/lib/image-metadata';
import type { PresentationData, SlideData } from '@/types/presentation';
import { samples } from '../lib/services/credit-samples';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const slide: SlideData = {
  slideNumber: 2, part: 'Discussion', title: 'H_2O and x^2',
  contentPoints: ['Water H_2O', 'Energy x^2'], visualDescription: 'Water molecules',
};
const presentation: PresentationData = {
  subject: 'Science', topic: 'Water', originalWriters: 'Teacher Maria',
  slides: [{ ...slide, slideNumber: 1, title: 'Welcome' }, slide],
};
const defaults = { isOpen: true, onClose: vi.fn(), presentationData: presentation, session: 'Session 1', slideImages: { 1: 'image' }, initialIndex: 1 };

function show(metadata?: ImageMetadata, image: string | undefined = 'image') {
  return render(<SlideshowModal {...defaults} presentationData={{ ...presentation, slides: [presentation.slides[0], { ...slide, imageMetadata: metadata }] }}
    slideImages={image === undefined ? {} : { 1: image }} />);
}

function matchViewport(width: number, portrait: boolean) {
  // Only the requested narrow portrait query is true for this viewport.
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === '(max-width: 767px) and (orientation: portrait)' && width <= 767 && portrait,
    media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }));
}

describe('Slideshow shared slide rendering', () => {
  it('renders the full accessible slide with formatted formulas', () => {
    show();
    const group = screen.getByRole('group', { name: 'Slide 2 of 2' });
    expect(group.getAttribute('aria-hidden')).toBeNull();
    expect(group.style.aspectRatio).toBe('16 / 9');
    expect(group.querySelectorAll('sub').length).toBe(2);
    expect(group.querySelectorAll('sup').length).toBe(2);
    expect(within(group).getByRole('list').textContent).toContain('Water H2O');
  });

  it('passes the title page writers through to SlideView', () => {
    render(<SlideshowModal {...defaults} initialIndex={0} />);
    expect(within(screen.getByRole('group', { name: 'Slide 1 of 2' })).getByText('Original Lesson Plan Writers: Teacher Maria')).toBeTruthy();
  });

  it('fits the slide against both container dimensions without a maximum width', () => {
    show();
    const slideRoot = screen.getByRole('group', { name: 'Slide 2 of 2' });
    const fitted = slideRoot.parentElement!;
    expect(fitted.style.width).toBe('min(100cqw, 177.7777777777778cqh)');
    expect(fitted.parentElement!.style.containerType).toBe('size');
    expect(fitted.className).not.toMatch(/max-w-/);
  });

  it.each([
    { label: 'NASA', metadata: samples.nasaFull, text: 'Photographer: Jane; Secondary creator: Different credit', source: 'https://images-assets.nasa.gov/image/roots/collection.json', fit: 'object-cover', license: undefined },
    { label: 'Commons', metadata: samples.commonsFull, text: 'Creator: Original artist; License: CC BY 4.0', source: 'https://commons.wikimedia.org/wiki/File:Diagram_(v2).png', fit: 'object-contain', license: 'CC BY 4.0' },
    { label: 'Commons', metadata: { ...samples.commonsFull, licenseKind: 'cc-by-sa' as const, licenseName: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' }, text: 'Creator: Original artist; License: CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Diagram_(v2).png', fit: 'object-contain', license: 'CC BY-SA 4.0' },
  ])('keeps the $license $label attribution links below the shared slide', ({ metadata, label, text, source, fit, license }) => {
    show(metadata);
    const group = screen.getByRole('group', { name: 'Slide 2 of 2' });
    expect(within(group).getByRole('img', { name: 'Water molecules' }).className).toBe(fit);
    const caption = screen.getByRole('figure').querySelector('figcaption')!;
    expect(within(caption).getByRole('link', { name: `${label} source` }).getAttribute('href')).toBe(source);
    expect(within(caption).getByText(text).getAttribute('aria-hidden')).toBe('true');
    expect(within(group).getByText(new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).closest('[aria-hidden="true"]')).toBeNull();
    if (license) {
      expect(within(caption).getByRole('link', { name: `License: ${license}` }).getAttribute('href')).toBe(metadata.source === 'commons' ? metadata.licenseUrl : undefined);
    } else {
      expect(within(caption).queryByRole('link', { name: /^License:/ })).toBeNull();
    }
  });

  it('renders an AI content image with SlideView fit and no attribution bar', () => {
    show();
    expect(within(screen.getByRole('group', { name: 'Slide 2 of 2' })).getByRole('img').className).toBe('object-cover');
    expect(screen.getByRole('figure').querySelector('figcaption')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it.each(['', 'failed'])('does not add an attribution bar for metadata without a usable image (%s)', (image) => {
    show(samples.commonsFull, image);
    expect(screen.getByRole('figure').querySelector('figcaption')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });
});

describe('Slideshow portrait guidance', () => {
  it('shows the portrait phone hint, supports dismissal and resets it each time the dialog opens', () => {
    matchViewport(390, true);
    const view = render(<SlideshowModal {...defaults} />);
    expect(screen.getByText('Rotate your phone for a larger slide')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss rotate hint' }));
    expect(screen.queryByText('Rotate your phone for a larger slide')).toBeNull();
    view.rerender(<SlideshowModal {...defaults} isOpen={false} />);
    view.rerender(<SlideshowModal {...defaults} />);
    expect(screen.getByText('Rotate your phone for a larger slide')).toBeTruthy();
  });

  it.each([{ width: 767, portrait: false }, { width: 768, portrait: true }, { width: 1440, portrait: false }])('hides the hint at $width px, portrait=$portrait', ({ width, portrait }) => {
    matchViewport(width, portrait);
    show();
    expect(screen.queryByText('Rotate your phone for a larger slide')).toBeNull();
  });

  it('does not assume a portrait phone when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);
    show();
    expect(screen.queryByText('Rotate your phone for a larger slide')).toBeNull();
  });
});
