// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { SlideImageControls } from '@/components/SlideImageControls';
import { SlideshowModal } from '@/components/SlideshowModal';

// Captured from SlideCard and SlideshowModal before slide-image.ts existed: [case, slideImage, rendered src].
// SlideCard retired in Phase 6; its image preview now lives in SlideImageControls (the Normal panel).
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const JPG = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP8=';
const cases: [string, string, string | null][] = [
  ['empty', '', null],
  ['failed', 'failed', null],
  ['raw PNG', PNG, `data:image/png;base64,${PNG}`],
  // Accepted change: a raw JPEG is now labelled image/jpeg (was image/png); browsers render both the same.
  ['raw JPEG', JPG, `data:image/jpeg;base64,${JPG}`],
  ['PNG data URL', `data:image/png;base64,${PNG}`, `data:image/png;base64,${PNG}`],
  ['JPEG data URL', `data:image/jpeg;base64,${JPG}`, `data:image/jpeg;base64,${JPG}`],
];
const slide = { slideNumber: 1, part: 'Discussion', title: 'Roots', contentPoints: ['P'], visualDescription: 'V' };

describe.each(cases)('a %s slide image', (_, image, src) => {
  it('renders the same src in the panel image controls', () => {
    const { container } = render(<SlideImageControls slide={slide} slideId={1} slideImage={image} onRegenerateImage={vi.fn()} />);
    expect(container.querySelector('img')?.getAttribute('src') ?? null).toBe(src);
  });

  it('renders the same src in the slideshow', () => {
    render(<SlideshowModal isOpen onClose={vi.fn()} presentationData={{ subject: 'S', originalWriters: 'T', topic: 't', slides: [slide, slide] }}
      session="S" initialIndex={1} slideImages={{ 1: image }} />);
    expect(document.querySelector('[role=dialog] img')?.getAttribute('src') ?? null).toBe(src);
  });
});
