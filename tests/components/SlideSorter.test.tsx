// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { SlideSorter, type SlideSorterProps } from '@/components/workspace/SlideSorter';
import type { SlideData } from '@/types/presentation';
import type { SlideViewProps } from '@/components/SlideView';

const { views } = vi.hoisted(() => ({ views: vi.fn() }));
vi.mock('@/components/SlideView', () => ({ SlideView: (props: SlideViewProps) => {
  views(props); return <div aria-hidden="true">{props.slide.title}</div>;
} }));
afterEach(() => { cleanup(); views.mockClear(); });
const slides: SlideData[] = ['Plants', 'Leaves', 'Flowers'].map((title, i) => ({
  title, slideNumber: i + 1, part: 'Discussion', contentPoints: [title], visualDescription: '',
}));
function props(): SlideSorterProps {
  return { slides, slideIds: [10, 20, 30], selectedId: 20, onSelect: vi.fn(), onOpen: vi.fn(),
    onMove: vi.fn(), onDuplicate: vi.fn(), onDelete: vi.fn(), originalWriters: 'Teacher' };
}
function cards() { return within(screen.getByRole('list', { name: 'Slides in sorter' })).getAllByRole('listitem'); }

describe('SlideSorter', () => {
  it('renders a list of numbered, selected thumbnail cards and the export hint', () => {
    render(<SlideSorter {...props()} />);
    expect(cards()).toHaveLength(3);
    expect(cards()[1].getAttribute('aria-current')).toBe('true');
    expect(cards().map(card => within(card).getByText(/^\d$/).textContent)).toEqual(['1', '2', '3']);
    expect(screen.getByText('The first slide uses the title layout in the exported file.')).toBeTruthy();
    expect(views.mock.calls.every(([p]) => p.variant === 'thumbnail')).toBe(true);
  });

  it('selects on click and opens Normal on double-click or Enter', () => {
    const handlers = props(); render(<SlideSorter {...handlers} />);
    fireEvent.click(cards()[2]); expect(handlers.onSelect).toHaveBeenCalledWith(30);
    fireEvent.doubleClick(cards()[1]); expect(handlers.onOpen).toHaveBeenCalledWith(20);
    fireEvent.keyDown(cards()[0], { key: 'Enter' }); expect(handlers.onOpen).toHaveBeenLastCalledWith(10);
  });

  it('calls duplicate, delete and both move controls with stable ids and target indexes', () => {
    const handlers = props(); render(<SlideSorter {...handlers} />);
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate slide 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete slide 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move slide 2 earlier' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move slide 2 later' }));
    expect(handlers.onDuplicate).toHaveBeenCalledWith(20);
    expect(handlers.onDelete).toHaveBeenCalledWith(20);
    expect(vi.mocked(handlers.onMove).mock.calls).toEqual([[20, 0], [20, 2]]);
    expect(handlers.onSelect).not.toHaveBeenCalled();
    fireEvent.doubleClick(screen.getByRole('button', { name: 'Duplicate slide 2' }));
    fireEvent.keyDown(screen.getByRole('button', { name: 'Duplicate slide 2' }), { key: 'Enter' });
    expect(handlers.onOpen).not.toHaveBeenCalled();
  });

  it('disables moves at the ends and deletion of the only slide', () => {
    const handlers = props(); const { rerender } = render(<SlideSorter {...handlers} />);
    expect(screen.getByRole('button', { name: 'Move slide 1 earlier' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Move slide 3 later' }).hasAttribute('disabled')).toBe(true);
    rerender(<SlideSorter {...handlers} slides={[slides[0]]} slideIds={[10]} selectedId={10} />);
    expect(screen.getByRole('button', { name: 'Delete slide 1' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Move slide 1 later' }).hasAttribute('disabled')).toBe(true);
  });

  it('reorders on drag and highlights the drop target, but ignores dropping onto itself', () => {
    const handlers = props(); render(<SlideSorter {...handlers} />);
    fireEvent.dragStart(cards()[0]); fireEvent.dragOver(cards()[2]);
    expect(cards()[2].className).toContain('border-dashed');
    fireEvent.drop(cards()[2]); expect(handlers.onMove).toHaveBeenCalledWith(10, 2);
    vi.mocked(handlers.onMove).mockClear();
    fireEvent.dragStart(cards()[1]); fireEvent.dragOver(cards()[1]); fireEvent.drop(cards()[1]);
    expect(handlers.onMove).not.toHaveBeenCalled();
  });

  it('does not rerender unchanged thumbnails when one slide is edited or a partial range moves', () => {
    const handlers = props(); const { rerender } = render(<SlideSorter {...handlers} />);
    views.mockClear();
    rerender(<SlideSorter {...handlers} slides={[slides[0], { ...slides[1], title: 'Edited' }, slides[2]]} />);
    expect(views).toHaveBeenCalledTimes(1);
    views.mockClear();
    rerender(<SlideSorter {...handlers} slides={[slides[0], slides[2], slides[1]]} slideIds={[10,30,20]} />);
    expect(views).toHaveBeenCalledTimes(2);
    expect(views.mock.calls.some(([p]) => p.slide.title === 'Plants')).toBe(false);
  });
});
