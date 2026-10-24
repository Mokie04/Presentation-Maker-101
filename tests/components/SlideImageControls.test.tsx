// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SlideImageControls } from '@/components/SlideImageControls';
import type { SlideData } from '@/types/presentation';
import type { ImageMetadata } from '@/lib/image-metadata';

const metadata: ImageMetadata = {
  source: 'commons', fileId: 42, title: 'File:Roots.png', creator: 'Original artist',
  licenseKind: 'cc-by', licenseName: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Roots.png',
  assetUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Roots.png', rendition: 'thumbnail', mimeType: 'image/png',
  description: 'Roots in a garden',
};
const slide: SlideData = {
  slideNumber: 1, part: 'Discussion', title: 'Roots', contentPoints: ['Roots absorb water'], visualDescription: 'Roots in soil',
};
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('SlideImageControls', () => {
  it('renders the visual prompt and regenerates the stable slide id', () => {
    const onRegenerateImage = vi.fn();
    render(<SlideImageControls slide={slide} slideId={17} onRegenerateImage={onRegenerateImage} />);
    expect(screen.getByText(/Roots in soil/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Render Visual Concept Image' }));
    expect(onRegenerateImage).toHaveBeenCalledWith(17, 'Roots in soil');
  });

  it('shows a generated image with its regeneration action', () => {
    const onRegenerateImage = vi.fn();
    render(<SlideImageControls slide={slide} slideId={17} slideImage="image-data" onRegenerateImage={onRegenerateImage} />);
    expect(screen.getByRole('img', { name: 'Roots' }).getAttribute('src')).toBe('data:image/png;base64,image-data');
    expect(screen.getByText('Generated live')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate AI Graphic' }));
    expect(onRegenerateImage).toHaveBeenCalledWith(17, 'Roots in soil');
  });

  it('disables rendering and suppresses stale errors during generation', () => {
    render(<SlideImageControls slide={slide} slideId={17} isGeneratingImage imageError="secret provider error" onRegenerateImage={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Rendering Image...' }).hasAttribute('disabled')).toBe(true);
    expect(screen.queryByText(/failed|secret provider error/)).toBeNull();
  });

  it.each([
    [undefined, 'Image generation failed. Try again.'],
    ['failed', 'Image generation failed. Try again.'],
    ['image-data', 'Regeneration failed. Kept the previous image.'],
  ])('uses a fixed failure message for image %s', (slideImage, message) => {
    render(<SlideImageControls slide={slide} slideId={17} slideImage={slideImage} imageError="secret provider error" onRegenerateImage={vi.fn()} />);
    expect(screen.getByText(message)).toBeTruthy();
    expect(screen.queryByText(/secret provider error/)).toBeNull();
  });

  it('preserves source, license, description and contained Commons image', () => {
    render(<SlideImageControls slide={{ ...slide, imageMetadata: metadata }} slideId={17} slideImage="image-data" onRegenerateImage={vi.fn()} />);
    expect(screen.getByText('Selected Commons image')).toBeTruthy();
    expect(screen.getByRole('img').className).toContain('object-contain');
    const source = screen.getByRole('link', { name: 'Commons source' });
    const license = screen.getByRole('link', { name: 'License: CC BY 4.0' });
    expect(source.getAttribute('href')).toBe(metadata.sourceUrl);
    expect(license.getAttribute('href')).toBe(metadata.licenseUrl);
    for (const link of [source, license]) {
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    }
    expect(source.nextElementSibling).toBe(license);
    expect(screen.getByText('Source description')).toBeTruthy();
    expect(screen.getByText('Roots in a garden')).toBeTruthy();
  });

  it('searches the real picker and returns the chosen image with its stable slide id', async () => {
    const onSelectImage = vi.fn();
    const nasa: ImageMetadata = { source: 'nasa', nasaId: 'roots', assetUrl: 'https://images-assets.nasa.gov/image/roots/roots~large.jpg', rendition: 'large', mimeType: 'image/jpeg' };
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ candidates: [{ ...nasa, selectable: true, title: 'NASA roots' }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ base64: 'chosen-image', metadata: nasa }) }));
    render(<SlideImageControls slide={slide} slideId={17} onSelectImage={onSelectImage} onRegenerateImage={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Find image' }));
    expect(screen.getByLabelText('NASA search terms').getAttribute('value')).toBe('Roots');
    fireEvent.click(screen.getByRole('button', { name: 'Search NASA' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Use this image' }));
    await waitFor(() => expect(onSelectImage).toHaveBeenCalledWith(17, 'chosen-image', nasa));
    expect(screen.queryByRole('region', { name: 'NASA image search' })).toBeNull();
  });

  it('cancels the picker without selecting an image', () => {
    const onSelectImage = vi.fn();
    render(<SlideImageControls slide={slide} slideId={17} onSelectImage={onSelectImage} onRegenerateImage={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Find image' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel NASA picker' }));
    expect(screen.getByRole('button', { name: 'Find image' })).toBeTruthy();
    expect(onSelectImage).not.toHaveBeenCalled();
  });

  // Ported from the retired SlideCard tests (Phase 6).
  it('shows no failure message without an error and keeps regeneration available after a failure', () => {
    const { rerender } = render(<SlideImageControls slide={slide} slideId={17} slideImage="image-data" onRegenerateImage={vi.fn()} />);
    expect(screen.queryByText(/failed\./)).toBeNull();
    rerender(<SlideImageControls slide={slide} slideId={17} slideImage="image-data" imageError="quota exceeded" onRegenerateImage={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Regenerate AI Graphic' }).hasAttribute('disabled')).toBe(false);
  });

  it.each<[string, ImageMetadata]>([
    ['Commons without a license URL', { ...metadata, licenseUrl: undefined } as ImageMetadata],
    ['NASA', { source: 'nasa', nasaId: 'roots', photographer: 'Jane', assetUrl: 'https://images-assets.nasa.gov/image/roots/roots~large.jpg', rendition: 'large', mimeType: 'image/jpeg' }],
  ])('shows no license link for %s', (_, imageMetadata) => {
    render(<SlideImageControls slide={{ ...slide, imageMetadata }} slideId={17} slideImage="image-data" onRegenerateImage={vi.fn()} />);
    expect(screen.getByRole('link', { name: /source$/ })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /^License:/ })).toBeNull();
  });

  it('omits the image section when no visual description exists', () => {
    const { container } = render(<SlideImageControls slide={{ ...slide, visualDescription: '' }} slideId={17} onRegenerateImage={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });
});
