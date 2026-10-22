// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { SlideCard } from '@/components/SlideCard';
import { SlideshowModal } from '@/components/SlideshowModal';

// Captured from SlideCard and SlideshowModal before slide-image.ts existed: [case, slideImage, rendered src].
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
  it('renders the same src on the card', () => {
    const { container } = render(<SlideCard slide={slide} slideId={1} totalSlides={1} isEditing={false} slideImage={image}
      onUpdateTitle={vi.fn()} onUpdateBullet={vi.fn()} onAddBullet={vi.fn()} onDeleteBullet={vi.fn()} onDeleteSlide={vi.fn()} onRegenerateImage={vi.fn()} />);
    expect(container.querySelector('img')?.getAttribute('src') ?? null).toBe(src);
  });

  it('renders the same src in the slideshow', () => {
    render(<SlideshowModal isOpen onClose={vi.fn()} presentationData={{ subject: 'S', originalWriters: 'T', topic: 't', slides: [slide] }}
      session="S" slideImages={{ 0: image }} />);
    expect(document.querySelector('[role=dialog] img')?.getAttribute('src') ?? null).toBe(src);
  });
});
