// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SlideCard } from '@/components/SlideCard';
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
        index={0}
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
        index={0}
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
    expect(handleUpdateTitle).toHaveBeenCalledWith(0, 'New Slide Title');

    // Bullet input
    const bulletInput = screen.getByDisplayValue('Plants make their own food through sunlight');
    fireEvent.change(bulletInput, { target: { value: 'Updated first point' } });
    expect(handleUpdateBullet).toHaveBeenCalledWith(0, 0, 'Updated first point');

    // Add bullet button
    const addBulletBtn = screen.getByRole('button', { name: /\+ Add Bullet Point/i });
    fireEvent.click(addBulletBtn);
    expect(handleAddBullet).toHaveBeenCalledWith(0);

    // Delete first bullet
    const deleteBulletBtns = screen.getAllByRole('button', { name: /Remove Bullet/i });
    fireEvent.click(deleteBulletBtns[0]);
    expect(handleDeleteBullet).toHaveBeenCalledWith(0, 0);

    // Delete slide button
    const deleteSlideBtn = screen.getByRole('button', { name: /Delete Slide/i });
    fireEvent.click(deleteSlideBtn);
    expect(handleDeleteSlide).toHaveBeenCalledWith(0);
  });

  it('renders image when slideImage is provided, and button triggers regeneration', () => {
    const handleRegen = vi.fn();

    const { rerender } = render(
      <SlideCard
        slide={sampleSlide}
        index={0}
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
    expect(handleRegen).toHaveBeenCalledWith(0, sampleSlide.visualDescription);

    // Rerender without image -> shows prompt and render button
    rerender(
      <SlideCard
        slide={sampleSlide}
        index={0}
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
    expect(handleRegen).toHaveBeenCalledWith(0, sampleSlide.visualDescription);
  });
});
