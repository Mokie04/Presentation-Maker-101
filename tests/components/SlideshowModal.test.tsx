// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { SlideshowModal } from '@/components/SlideshowModal';
import type { ImageMetadata } from '@/lib/image-metadata';
import type { PresentationData } from '@/types/presentation';

describe('SlideshowModal component', () => {
  const samplePresentation: PresentationData = {
    subject: 'Science',
    originalWriters: 'DepEd Teachers',
    topic: 'Solar System Exploration',
    slides: [
      {
        slideNumber: 1,
        part: 'Motivation',
        title: 'Welcome to Space',
        contentPoints: ['Look up at the night sky', 'Count the stars'],
        visualDescription: 'Night sky with twinkling stars and moon',
      },
      {
        slideNumber: 2,
        part: 'Lesson Presentation',
        title: 'The Inner Planets',
        contentPoints: ['Mercury, Venus, Earth, Mars'],
        visualDescription: 'Diagram of four terrestrial planets',
      },
    ],
  };

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <SlideshowModal
        isOpen={false}
        onClose={vi.fn()}
        presentationData={samplePresentation}
        session="Session 1"
        slideImages={{}}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders slide content and navigates using Next, Previous, and select jump', () => {
    const handleClose = vi.fn();

    render(
      <SlideshowModal
        isOpen={true}
        onClose={handleClose}
        presentationData={samplePresentation}
        session="Session 1"
        slideImages={{}}
      />
    );

    expect(screen.getByText(/Solar System Exploration/i)).toBeTruthy();
    expect(screen.getByText('Welcome to Space')).toBeTruthy();
    expect(screen.getAllByText('Slide 1 of 2').length).toBeGreaterThan(0);

    // Click Next
    const nextBtn = screen.getByRole('button', { name: /^Next/i });
    fireEvent.click(nextBtn);

    expect(screen.getByText('The Inner Planets')).toBeTruthy();
    expect(screen.getAllByText('Slide 2 of 2').length).toBeGreaterThan(0);

    // Click Previous
    const prevBtn = screen.getByRole('button', { name: /^Previous/i });
    fireEvent.click(prevBtn);

    expect(screen.getByText('Welcome to Space')).toBeTruthy();

    // Select Jump
    const select = screen.getByLabelText(/Jump to slide/i) || screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '1' } }); // 0-indexed slide 2
    expect(screen.getByText('The Inner Planets')).toBeTruthy();

    // Close button
    const closeBtn = screen.getByRole('button', { name: /Exit Slideshow/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalled();
  });

  it('handles keyboard navigation (ArrowRight, ArrowLeft, Space, Escape)', () => {
    const handleClose = vi.fn();

    render(
      <SlideshowModal
        isOpen={true}
        onClose={handleClose}
        presentationData={samplePresentation}
        session="Session 1"
        slideImages={{}}
      />
    );

    expect(screen.getByText('Welcome to Space')).toBeTruthy();

    // ArrowRight -> next slide
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText('The Inner Planets')).toBeTruthy();

    // ArrowLeft -> previous slide
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByText('Welcome to Space')).toBeTruthy();

    // Space -> next slide
    fireEvent.keyDown(window, { key: ' ' });
    expect(screen.getByText('The Inner Planets')).toBeTruthy();

    // Escape -> close
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalled();
  });

  it('handles mobile touch swipe navigation when delta > 60px', () => {
    const { container } = render(
      <SlideshowModal
        isOpen={true}
        onClose={vi.fn()}
        presentationData={samplePresentation}
        session="Session 1"
        slideImages={{}}
      />
    );

    const modal = container.firstChild as HTMLElement;

    // Swipe left (next slide)
    fireEvent.touchStart(modal, { touches: [{ clientX: 200, clientY: 100 }] });
    fireEvent.touchEnd(modal, { changedTouches: [{ clientX: 100, clientY: 100 }] }); // delta = -100

    expect(screen.getByText('The Inner Planets')).toBeTruthy();

    // Swipe right (prev slide)
    fireEvent.touchStart(modal, { touches: [{ clientX: 100, clientY: 100 }] });
    fireEvent.touchEnd(modal, { changedTouches: [{ clientX: 200, clientY: 100 }] }); // delta = +100

    expect(screen.getByText('Welcome to Space')).toBeTruthy();
  });
});

describe('SlideshowModal image credit caption', () => {
  const nasa: ImageMetadata = {
    source: 'nasa', nasaId: 'moon', photographer: 'Jane', sourceUrl: 'https://images-assets.nasa.gov/image/moon/collection.json',
    assetUrl: 'https://images-assets.nasa.gov/image/moon/moon~large.jpg', rendition: 'large', mimeType: 'image/jpeg',
  };
  const commons: ImageMetadata = {
    source: 'commons', fileId: 42, title: 'File:Planets.png', creator: 'Original artist',
    licenseKind: 'cc-by', licenseName: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Planets.png',
    assetUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Planets.png', rendition: 'thumbnail', mimeType: 'image/png',
  };

  function slide(title: string, imageMetadata?: ImageMetadata) {
    return { slideNumber: 1, part: 'Discussion', title, contentPoints: [title], visualDescription: `${title} visual`, imageMetadata };
  }

  function renderSlides(slides: ReturnType<typeof slide>[], slideImages: Record<number, string>) {
    render(
      <SlideshowModal
        isOpen={true}
        onClose={vi.fn()}
        presentationData={{ subject: 'Science', originalWriters: 'Teacher', topic: 'Space', slides }}
        session="Session 1"
        slideImages={slideImages}
      />
    );
  }

  function caption() {
    return screen.queryByRole('figure')?.querySelector('figcaption') ?? null;
  }

  it('credits a NASA image with its source link', () => {
    renderSlides([slide('Moon', nasa)], { 0: 'moon-image' });
    const figcaption = caption()!;
    expect(within(figcaption).getByText('Photographer: Jane')).toBeTruthy();
    const source = within(figcaption).getByRole('link', { name: 'NASA source' });
    expect(source.getAttribute('href')).toBe(nasa.sourceUrl);
    expect(source.getAttribute('target')).toBe('_blank');
    expect(source.getAttribute('rel')).toBe('noopener noreferrer');
    expect(within(figcaption).queryByRole('link', { name: /^License:/ })).toBeNull();
    expect(within(screen.getByRole('figure')).getByRole('img', { name: 'Moon' })).toBeTruthy();
  });

  it('credits a Commons image with source and license links', () => {
    renderSlides([slide('Planets', commons)], { 0: 'planets-image' });
    const figcaption = caption()!;
    expect(within(figcaption).getByText('Creator: Original artist; License: CC BY 4.0')).toBeTruthy();
    expect(within(figcaption).getByRole('link', { name: 'Commons source' }).getAttribute('href')).toBe(commons.sourceUrl);
    const license = within(figcaption).getByRole('link', { name: 'License: CC BY 4.0' });
    expect(license.getAttribute('href')).toBe(commons.licenseUrl);
    expect(license.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('shows no caption for an AI image without credit', () => {
    renderSlides([slide('Stars')], { 0: 'ai-image' });
    expect(screen.getByRole('img', { name: 'Stars' })).toBeTruthy();
    expect(caption()).toBeNull();
    expect(screen.queryByRole('link', { name: /source$/ })).toBeNull();
  });

  it.each([
    ['no image', {}],
    ['a failed image', { 0: 'failed' }],
  ])('shows no caption for a credited slide with %s', (_, slideImages) => {
    renderSlides([slide('Moon', nasa)], slideImages);
    expect(caption()).toBeNull();
    expect(screen.queryByText('Photographer: Jane')).toBeNull();
  });

  it('updates the caption when navigating between slides', () => {
    renderSlides([slide('Moon', nasa), slide('Planets', commons), slide('Stars')], { 0: 'moon', 1: 'planets', 2: 'stars' });
    expect(within(caption()!).getByRole('link', { name: 'NASA source' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Next/i }));
    expect(within(caption()!).getByRole('link', { name: 'Commons source' })).toBeTruthy();
    expect(screen.queryByText('Photographer: Jane')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Next/i }));
    expect(caption()).toBeNull();
  });

  it.each([
    { source: 'Commons', metadata: commons, fit: 'object-contain', otherFit: 'object-cover' },
    { source: 'NASA', metadata: nasa, fit: 'object-cover', otherFit: 'object-contain' },
    { source: 'AI', metadata: undefined, fit: 'object-cover', otherFit: 'object-contain' },
  ])('uses $fit for a $source image', ({ metadata, fit, otherFit }) => {
    renderSlides([slide('Planets', metadata)], { 0: 'image' });
    const image = screen.getByRole('img', { name: 'Planets' });
    expect(image.classList.contains(fit)).toBe(true);
    expect(image.classList.contains(otherFit)).toBe(false);
  });
});
