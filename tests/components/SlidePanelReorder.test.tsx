// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SlidePanel, type SlidePanelProps } from '@/components/workspace/SlidePanel';
afterEach(cleanup);
const base: SlidePanelProps = {
  slide: { slideNumber: 2, title: 'Leaves', part: 'Discussion', contentPoints: ['Food'], visualDescription: '' },
  slideId: 45, onUpdateTitle: vi.fn(), onUpdateBullet: vi.fn(), onAddBullet: vi.fn(), onDeleteBullet: vi.fn(),
  onDeleteSlide: vi.fn(), onRegenerateImage: vi.fn(), onAddSlide: vi.fn(),
};
it('duplicates and moves the selected stable id from the Normal panel', () => {
  const onDuplicateSlide = vi.fn(), onMoveSlide = vi.fn();
  render(<SlidePanel {...base} slideIndex={1} totalSlides={3} onDuplicateSlide={onDuplicateSlide} onMoveSlide={onMoveSlide} />);
  fireEvent.click(screen.getByRole('button', { name: 'Duplicate slide' }));
  fireEvent.click(screen.getByRole('button', { name: 'Move slide 2 earlier' }));
  fireEvent.click(screen.getByRole('button', { name: 'Move slide 2 later' }));
  expect(onDuplicateSlide).toHaveBeenCalledWith(45);
  expect(onMoveSlide.mock.calls).toEqual([[45, 0], [45, 2]]);
});
it('disables panel moves beyond the first and last slide', () => {
  const props = { ...base, onMoveSlide: vi.fn(), onDuplicateSlide: vi.fn(), totalSlides: 3 };
  const { rerender } = render(<SlidePanel {...props} slideIndex={0} />);
  expect(screen.getByRole('button', { name: 'Move slide 1 earlier' }).hasAttribute('disabled')).toBe(true);
  rerender(<SlidePanel {...props} slideIndex={2} />);
  expect(screen.getByRole('button', { name: 'Move slide 3 later' }).hasAttribute('disabled')).toBe(true);
});
