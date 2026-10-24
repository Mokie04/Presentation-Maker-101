// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { SlidePanel, type SlidePanelProps } from '@/components/workspace/SlidePanel';

function props(): SlidePanelProps {
  return {
    slide: { slideNumber: 4, part: 'Discussion', title: 'Roots', contentPoints: ['Water', 'Minerals'], visualDescription: 'A tree' },
    slideId: 31,
    onUpdatePart: vi.fn(), onUpdateTitle: vi.fn(), onUpdateBullet: vi.fn(), onAddBullet: vi.fn(),
    onDeleteBullet: vi.fn(), onDeleteSlide: vi.fn(), onRegenerateImage: vi.fn(), onSelectImage: vi.fn(), onAddSlide: vi.fn(),
  };
}
afterEach(cleanup);

describe('SlidePanel', () => {
  it('edits only the selected stable id through all text and part controls', () => {
    const handlers = props();
    render(<SlidePanel {...handlers} />);
    expect(screen.getByRole('complementary', { name: 'Slide settings' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Pedagogical Part'), { target: { value: 'Assessment' } });
    fireEvent.change(screen.getByLabelText('Slide Title'), { target: { value: 'New title' } });
    fireEvent.change(screen.getByLabelText('Bullet 2'), { target: { value: 'Updated mineral' } });
    fireEvent.click(screen.getByRole('button', { name: '+ Add Bullet Point' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove Bullet' })[1]);
    expect(handlers.onUpdatePart).toHaveBeenCalledWith(31, 'Assessment');
    expect(handlers.onUpdateTitle).toHaveBeenCalledWith(31, 'New title');
    expect(handlers.onUpdateBullet).toHaveBeenCalledWith(31, 1, 'Updated mineral');
    expect(handlers.onAddBullet).toHaveBeenCalledWith(31);
    expect(handlers.onDeleteBullet).toHaveBeenCalledWith(31, 1);
  });

  it('deletes the selected slide and offers adding a slide', () => {
    const handlers = props();
    render(<SlidePanel {...handlers} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete Slide' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Add Slide' }));
    expect(handlers.onDeleteSlide).toHaveBeenCalledWith(31);
    expect(handlers.onAddSlide).toHaveBeenCalledWith();
  });

  it.each(['Activity', 'Teacher reflection'])('keeps the noncanonical part %s selectable', (part) => {
    const handlers = props();
    render(<SlidePanel {...handlers} slide={{ ...handlers.slide, part }} />);
    expect(screen.getByLabelText('Pedagogical Part').getAttribute('aria-label')).toBe('Pedagogical Part');
    expect((screen.getByLabelText('Pedagogical Part') as HTMLSelectElement).value).toBe(part);
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Title Page', 'Review', 'Motivation', 'Lesson Presentation', 'Discussion', 'Activities', 'Assessment', part,
    ]);
  });

  it('uses the shared regeneration controls for the selected id and generating state', () => {
    const handlers = props();
    const { rerender } = render(<SlidePanel {...handlers} />);
    fireEvent.click(screen.getByRole('button', { name: 'Render Visual Concept Image' }));
    expect(handlers.onRegenerateImage).toHaveBeenCalledWith(31, 'A tree');
    rerender(<SlidePanel {...handlers} isGeneratingImage />);
    expect(screen.getByRole('button', { name: 'Rendering Image...' }).hasAttribute('disabled')).toBe(true);
  });

  it('replaces selected data and closes the old picker when the selected id changes', () => {
    const handlers = props();
    const { rerender } = render(<SlidePanel {...handlers} />);
    fireEvent.click(screen.getByRole('button', { name: 'Find image' }));
    rerender(<SlidePanel {...handlers} slideId={99} slide={{ ...handlers.slide, title: 'Leaves', contentPoints: ['Sunlight'] }} />);
    expect((screen.getByLabelText('Slide Title') as HTMLInputElement).value).toBe('Leaves');
    expect((screen.getByLabelText('Bullet 1') as HTMLTextAreaElement).value).toBe('Sunlight');
    expect(screen.queryByLabelText('Bullet 2')).toBeNull();
    expect(screen.queryByRole('region', { name: 'NASA image search' })).toBeNull();
    fireEvent.change(screen.getByLabelText('Slide Title'), { target: { value: 'New leaves' } });
    expect(handlers.onUpdateTitle).toHaveBeenCalledWith(99, 'New leaves');
  });
});
