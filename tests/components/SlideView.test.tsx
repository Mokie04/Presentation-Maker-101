// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { SlideView } from '@/components/SlideView';
import { CONTENT_LAYOUT, SLIDE_HEIGHT, SLIDE_WIDTH, SLIDE_WIDTH_PT, TITLE_LAYOUT } from '@/lib/slide-theme';
import { describeImageCredit } from '@/lib/image-credit';
import type { SlideData } from '@/types/presentation';
import { samples } from '../lib/services/credit-samples';

// Next transforms fonts at build time; component tests exercise the resulting CSS variable.
vi.mock('next/font/local', () => ({ default: () => ({ variable: 'poppins-variable' }) }));
afterEach(cleanup);

const slide: SlideData = {
  slideNumber: 99, part: 'Discussion', title: 'Water and energy',
  contentPoints: ['Observe water', 'Discuss your findings'], visualDescription: '',
};
const image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

function show(changes: Partial<SlideData> = {}, index = 1, props: Partial<React.ComponentProps<typeof SlideView>> = {}) {
  return render(<SlideView slide={{ ...slide, ...changes }} index={index} total={3} {...props} />);
}

describe('SlideView', () => {
  it('renders the title layout with points, writers and slide number as real text', () => {
    const { container } = show({}, 0, { originalWriters: 'Teacher Maria' });
    expect(screen.getByText('DISCUSSION')).toBeTruthy();
    expect(screen.getByText(slide.title)).toBeTruthy();
    expect(screen.getByText('Observe water')).toBeTruthy();
    expect(screen.getByText('Discuss your findings')).toBeTruthy();
    expect(screen.getByText('Original Lesson Plan Writers: Teacher Maria')).toBeTruthy();
    expect(screen.getByText('Slide 1 of 3')).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Slide 1 of 3' })).toBeTruthy();
    expect(container.querySelector('[role="img"]')).toBeNull();
    expect(screen.getByText('Observe water').closest('p')!.style.fontWeight).toBe('700');
    expect(screen.getByText('Original Lesson Plan Writers: Teacher Maria').closest('p')!.style.fontWeight).toBe('700');
  });

  it.each(['WRITERS: Someone', 'Author: Someone', 'Prepared by TEACHER MARIA'])('does not duplicate attribution already present: %s', (point) => {
    show({ contentPoints: [point] }, 0, { originalWriters: 'Teacher Maria' });
    expect(screen.queryByText('Original Lesson Plan Writers: Teacher Maria')).toBeNull();
  });

  it('uses the generator defaults for an empty title slide', () => {
    show({ part: '', title: '', contentPoints: [] }, 0);
    expect(screen.getByText('TITLE PAGE')).toBeTruthy();
    expect(screen.getByText('Lesson Presentation')).toBeTruthy();
  });

  it.each([undefined, '', 'failed'])('shows a visual placeholder when the image is %s', (value) => {
    show({ visualDescription: 'A labelled water cycle' }, 1, { image: value });
    expect(screen.getByText(/\[PHILIPPINES CLASSROOM VISUAL DESIGN\]/)).toBeTruthy();
    expect(screen.getByText(/A labelled water cycle/)).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it.each([
    { metadata: samples.commonsFull, fit: 'object-contain' },
    { metadata: samples.nasaFull, fit: 'object-cover' },
    { metadata: undefined, fit: 'object-cover' },
  ])('renders image fit $fit for $metadata.source', ({ metadata, fit }) => {
    show({ visualDescription: 'Water molecules', imageMetadata: metadata }, 1, { image });
    const img = screen.getByRole('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe(`data:image/png;base64,${image}`);
    expect(img.className.split(' ')).toContain(fit);
    expect(screen.queryByText(/PHILIPPINES CLASSROOM/)).toBeNull();
  });

  it('keeps an existing data URL and renders the optional title library image', () => {
    show({ imageMetadata: samples.commonsFull }, 0, { image: `data:image/png;base64,${image}` });
    expect(screen.getByRole('img').getAttribute('src')).toBe(`data:image/png;base64,${image}`);
    expect(screen.getByRole('img').className).toContain('object-contain');
  });

  it('omits an AI image on the title layout and any image without a content visual', () => {
    const { rerender } = show({}, 0, { image });
    expect(screen.queryByRole('img')).toBeNull();
    rerender(<SlideView slide={slide} index={1} total={3} image={image} />);
    expect(screen.queryByRole('img')).toBeNull();
  });

  it.each([0, 1])('renders metadata credit even without an image in layout %s', (index) => {
    show({ imageMetadata: samples.commonsFull }, index);
    const credit = describeImageCredit(samples.commonsFull);
    expect(screen.getByText(`${credit.heading} — ${credit.creditLine}`)).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('uses wide bullets for whitespace-only visuals', () => {
    show({ visualDescription: '  \n ' });
    expect(screen.getByRole('list').style.width).toBe('88%');
    expect(screen.queryByText(/PHILIPPINES CLASSROOM/)).toBeNull();
  });

  it.each([{ length: 35, size: 33 }, { length: 36, size: 32 }])('fits an unbroken $length character content title at $size pt', ({ length, size }) => {
    show({ title: 'a'.repeat(length) });
    expect(screen.getByRole('heading').style.fontSize).toBe(`${size / 960 * 100}cqw`);
  });

  it.each([0, 1])('renders title and point formulas as subscript and superscript in layout %s', (index) => {
    const { container } = show({ title: 'H_2O and x^2', contentPoints: ['H_2O and x^2'] }, index);
    expect(container.querySelectorAll('sub').length).toBe(2);
    expect(container.querySelectorAll('sup').length).toBe(2);
  });

  it('renders a hidden, noninteractive thumbnail with the same text and geometry', () => {
    const { container } = show({}, 0, { variant: 'thumbnail' });
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(root.style.pointerEvents).toBe('none');
    expect(root.querySelectorAll('button, a, input, [tabindex]').length).toBe(0);
    expect(root.textContent).toContain(slide.title);
    expect(root.style.aspectRatio).toBe('16 / 9');
    expect(root.style.containerType).toBe('inline-size');
  });

  it('uses title geometry and container-scaled type from the theme', () => {
    show({}, 0);
    const title = screen.getByRole('heading');
    expect(title.style.left).toBe(`${TITLE_LAYOUT.title.x / SLIDE_WIDTH * 100}%`);
    expect(title.style.top).toBe(`${TITLE_LAYOUT.title.y / SLIDE_HEIGHT * 100}%`);
    expect(title.style.fontSize).toBe(`${TITLE_LAYOUT.title.fontSize / SLIDE_WIDTH_PT * 100}cqw`);
    expect(title.style.fontSize).toBe('4.6875cqw');
    expect(screen.getByText('Discuss your findings').closest('p')!.style.fontSize).toBe(`${22 / 960 * 100}cqw`);
  });

  it('uses content geometry and narrow bullets from the theme', () => {
    const { container } = show({ visualDescription: 'Water' });
    const bullets = screen.getByRole('list');
    expect(bullets.style.top).toBe(`${CONTENT_LAYOUT.bullets.y / SLIDE_HEIGHT * 100}%`);
    expect(bullets.style.width).toBe(CONTENT_LAYOUT.bulletsWithVisualWidth);
    expect(bullets.style.width).toBe('55%');
    expect(bullets.style.fontSize).toBe(`${CONTENT_LAYOUT.bullets.fontSize / SLIDE_WIDTH_PT * 100}cqw`);
    // DrawingML roundRect defaults to a radius of one sixth of the shorter side.
    const card = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(card.style.borderRadius).toBe('16.6667%');
  });
});
