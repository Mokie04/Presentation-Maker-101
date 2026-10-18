// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { SlideCard } from '@/components/SlideCard';
import type { ImageMetadata } from '@/lib/image-metadata';
import type { SlideData } from '@/types/presentation';

describe('SlideCard component', () => {
  const sampleSlide: SlideData = {
    slideNumber: 1,
    part: 'Motivation',
    title: 'Discovering Plant Superpowers',
    contentPoints: [
      'Plants make their own food through sunlight',
      'Chlorophyll acts as a natural solar panel',
    ],
    visualDescription: 'Cartoon of a smiling sunflower absorbing sunbeams in a Philippine garden',
  };

  it('renders correctly in view mode', () => {
    render(
      <SlideCard
        slide={sampleSlide}
        slideId={7}
        totalSlides={5}
        isEditing={false}
        onUpdateTitle={vi.fn()}
        onUpdateBullet={vi.fn()}
        onAddBullet={vi.fn()}
        onDeleteBullet={vi.fn()}
        onDeleteSlide={vi.fn()}
        onRegenerateImage={vi.fn()}
      />
    );

    expect(screen.getByText(/MOTIVATION/i)).toBeTruthy();
    expect(screen.getByText(/Slide 1/i)).toBeTruthy();
    expect(screen.getByText('Discovering Plant Superpowers')).toBeTruthy();
    expect(screen.getByText('Plants make their own food through sunlight')).toBeTruthy();
    expect(screen.getByText('Chlorophyll acts as a natural solar panel')).toBeTruthy();
  });

  it('renders edit controls in edit mode and triggers update callbacks', () => {
    const handleUpdateTitle = vi.fn();
    const handleUpdateBullet = vi.fn();
    const handleAddBullet = vi.fn();
    const handleDeleteBullet = vi.fn();
    const handleDeleteSlide = vi.fn();

    render(
      <SlideCard
        slide={sampleSlide}
        slideId={7}
        totalSlides={5}
        isEditing={true}
        onUpdateTitle={handleUpdateTitle}
        onUpdateBullet={handleUpdateBullet}
        onAddBullet={handleAddBullet}
        onDeleteBullet={handleDeleteBullet}
        onDeleteSlide={handleDeleteSlide}
        onRegenerateImage={vi.fn()}
      />
    );

    // Title input
    const titleInput = screen.getByDisplayValue('Discovering Plant Superpowers');
    fireEvent.change(titleInput, { target: { value: 'New Slide Title' } });
    expect(handleUpdateTitle).toHaveBeenCalledWith(7, 'New Slide Title');

    // Bullet input
    const bulletInput = screen.getByDisplayValue('Plants make their own food through sunlight');
    fireEvent.change(bulletInput, { target: { value: 'Updated first point' } });
    expect(handleUpdateBullet).toHaveBeenCalledWith(7, 0, 'Updated first point');

    // Add bullet button
    const addBulletBtn = screen.getByRole('button', { name: /\+ Add Bullet Point/i });
    fireEvent.click(addBulletBtn);
    expect(handleAddBullet).toHaveBeenCalledWith(7);

    // Delete first bullet
    const deleteBulletBtns = screen.getAllByRole('button', { name: /Remove Bullet/i });
    fireEvent.click(deleteBulletBtns[0]);
    expect(handleDeleteBullet).toHaveBeenCalledWith(7, 0);

    // Delete slide button
    const deleteSlideBtn = screen.getByRole('button', { name: /Delete Slide/i });
    fireEvent.click(deleteSlideBtn);
    expect(handleDeleteSlide).toHaveBeenCalledWith(7);
  });

  it('renders image when slideImage is provided, and button triggers regeneration', () => {
    const handleRegen = vi.fn();

    const { rerender } = render(
      <SlideCard
        slide={sampleSlide}
        slideId={7}
        totalSlides={5}
        isEditing={false}
        slideImage="sample-base64-data"
        onUpdateTitle={vi.fn()}
        onUpdateBullet={vi.fn()}
        onAddBullet={vi.fn()}
        onDeleteBullet={vi.fn()}
        onDeleteSlide={vi.fn()}
        onRegenerateImage={handleRegen}
      />
    );

    expect(screen.getByText(/Generated live/i)).toBeTruthy();

    const regenBtn = screen.getByRole('button', { name: /Regenerate AI Graphic/i });
    fireEvent.click(regenBtn);
    expect(handleRegen).toHaveBeenCalledWith(7, sampleSlide.visualDescription);

    // Rerender without image -> shows prompt and render button
    rerender(
      <SlideCard
        slide={sampleSlide}
        slideId={7}
        totalSlides={5}
        isEditing={false}
        slideImage={undefined}
        onUpdateTitle={vi.fn()}
        onUpdateBullet={vi.fn()}
        onAddBullet={vi.fn()}
        onDeleteBullet={vi.fn()}
        onDeleteSlide={vi.fn()}
        onRegenerateImage={handleRegen}
      />
    );

    expect(screen.getByText(/Cartoon of a smiling sunflower/i)).toBeTruthy();
    const renderBtn = screen.getByRole('button', { name: /Render Visual Concept Image/i });
    fireEvent.click(renderBtn);
    expect(handleRegen).toHaveBeenCalledWith(7, sampleSlide.visualDescription);
  });

  it('passes its slideId to the part callback', () => {
    const handleUpdatePart = vi.fn();
    render(
      <SlideCard
        slide={sampleSlide}
        slideId={7}
        totalSlides={5}
        isEditing={true}
        onUpdatePart={handleUpdatePart}
        onUpdateTitle={vi.fn()}
        onUpdateBullet={vi.fn()}
        onAddBullet={vi.fn()}
        onDeleteBullet={vi.fn()}
        onDeleteSlide={vi.fn()}
        onRegenerateImage={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('Pedagogical Part'), { target: { value: 'Assessment' } });
    expect(handleUpdatePart).toHaveBeenCalledWith(7, 'Assessment');
  });

  describe('failed regeneration message', () => {
    function renderCard(props: { slideImage?: string; imageError?: string; isGeneratingImage?: boolean }) {
      return render(
        <SlideCard
          slide={sampleSlide}
          slideId={7}
          totalSlides={5}
          isEditing={false}
          onUpdateTitle={vi.fn()}
          onUpdateBullet={vi.fn()}
          onAddBullet={vi.fn()}
          onDeleteBullet={vi.fn()}
          onDeleteSlide={vi.fn()}
          onRegenerateImage={vi.fn()}
          {...props}
        />
      );
    }

    it('says the previous image was kept when a regeneration fails over an image', () => {
      renderCard({ slideImage: 'sample-base64-data', imageError: 'quota exceeded' });
      expect(screen.getByText('Regeneration failed. Kept the previous image.')).toBeTruthy();
      expect(screen.queryByText(/quota exceeded/)).toBeNull();
      expect(screen.getByRole('button', { name: /Regenerate AI Graphic/i }).hasAttribute('disabled')).toBe(false);
    });

    it('asks to try again when a slide without an image fails', () => {
      renderCard({ slideImage: 'failed', imageError: 'upstream 500 at https://internal' });
      expect(screen.getByText('Image generation failed. Try again.')).toBeTruthy();
      expect(screen.queryByText(/internal/)).toBeNull();
    });

    it('shows no message while generating or without an error', () => {
      renderCard({ slideImage: 'sample-base64-data', imageError: 'quota', isGeneratingImage: true });
      expect(screen.queryByText(/failed\./)).toBeNull();
      cleanup();
      renderCard({ slideImage: 'sample-base64-data' });
      expect(screen.queryByText(/failed\./)).toBeNull();
    });
  });
});

describe('SlideCard license link', () => {
  const nasa: ImageMetadata = {
    source: 'nasa', nasaId: 'roots', photographer: 'Jane',
    assetUrl: 'https://images-assets.nasa.gov/image/roots/roots~large.jpg', rendition: 'large', mimeType: 'image/jpeg',
  };
  const commons: ImageMetadata = {
    source: 'commons', fileId: 42, title: 'File:Roots.png', creator: 'Original artist',
    licenseKind: 'cc-by', licenseName: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Roots.png',
    assetUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Roots.png', rendition: 'thumbnail', mimeType: 'image/png',
  };

  function renderWith(imageMetadata: ImageMetadata) {
    render(
      <SlideCard
        slide={{ slideNumber: 1, part: 'Discussion', title: 'Roots', contentPoints: ['Roots'], visualDescription: 'Roots', imageMetadata }}
        slideId={7}
        totalSlides={1}
        isEditing={false}
        slideImage="sample-base64-data"
        onUpdateTitle={vi.fn()}
        onUpdateBullet={vi.fn()}
        onAddBullet={vi.fn()}
        onDeleteBullet={vi.fn()}
        onDeleteSlide={vi.fn()}
        onRegenerateImage={vi.fn()}
      />
    );
  }

  it('links the Commons license after the source link', () => {
    renderWith(commons);
    const license = screen.getByRole('link', { name: 'License: CC BY 4.0' });
    expect(license.getAttribute('href')).toBe('https://creativecommons.org/licenses/by/4.0/');
    expect(license.getAttribute('target')).toBe('_blank');
    expect(license.getAttribute('rel')).toBe('noopener noreferrer');
    expect(screen.getByRole('link', { name: 'Commons source' }).nextElementSibling).toBe(license);
  });

  it.each([
    ['Commons without a license URL', { ...commons, licenseUrl: undefined }],
    ['NASA', nasa],
  ])('shows no license link for %s', (_, metadata) => {
    renderWith(metadata as ImageMetadata);
    expect(screen.queryByRole('link', { name: /^License:/ })).toBeNull();
  });
});
