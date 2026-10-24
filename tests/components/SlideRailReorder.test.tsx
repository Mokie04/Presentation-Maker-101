// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SlideRail } from '@/components/workspace/SlideRail';
import { navigateSlides } from '@/components/workspace/slide-navigation';
import type { SlideViewProps } from '@/components/SlideView';
import type { SlideData } from '@/types/presentation';

const { views } = vi.hoisted(() => ({ views: vi.fn() }));
vi.mock('@/components/SlideView', () => ({ SlideView: (props: SlideViewProps) => {
  views(props);
  return <span aria-hidden="true">{props.slide.title}</span>;
} }));

const slides: SlideData[] = ['Roots', 'Leaves', 'Flowers'].map((title, index) => ({
  slideNumber: index + 1, title, part: 'Discussion', contentPoints: [title], visualDescription: '',
}));
const slideIds = [10, 40, 70];

beforeEach(() => { views.mockClear(); Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);

describe('SlideRail reordering', () => {
  it('scrolls the selected thumbnail into view when its index changes after a move', () => {
    const props = { slideIds, selectedId: 40, onSelect: vi.fn(), total: 3, onMove: vi.fn() };
    const { rerender } = render(<SlideRail {...props} slides={slides} />);
    const scroll = vi.mocked(Element.prototype.scrollIntoView);
    expect(scroll).toHaveBeenCalledTimes(1);
    rerender(<SlideRail {...props} slides={[slides[0], slides[2], slides[1]]} slideIds={[10, 70, 40]} />);
    expect(scroll).toHaveBeenCalledTimes(2);
    expect(scroll.mock.contexts[1]).toBe(screen.getAllByRole('option')[2]);
  });

  it('moves a dragged stable id to the target index and shows a dashed target', () => {
    const onMove = vi.fn();
    render(<SlideRail slides={slides} slideIds={slideIds} selectedId={40} onSelect={vi.fn()} total={3} onMove={onMove} />);
    const options = screen.getAllByRole('option');
    expect(options.every(option => option.draggable)).toBe(true);
    fireEvent.dragStart(options[0]);
    fireEvent.dragOver(options[2]);
    expect(options[2].className).toContain('border-dashed');
    fireEvent.drop(options[2]);
    expect(onMove).toHaveBeenCalledExactlyOnceWith(10, 2);
    expect(options[2].className).not.toContain('border-dashed');
  });

  it.each([
    { selectedId: 40, key: 'ArrowUp', expected: [40, 0] },
    { selectedId: 40, key: 'ArrowDown', expected: [40, 2] },
  ])('moves the selected id with Alt+$key on the listbox', ({ selectedId, key, expected }) => {
    const onMove = vi.fn();
    render(<SlideRail slides={slides} slideIds={slideIds} selectedId={selectedId} onSelect={vi.fn()} total={3} onMove={onMove} />);
    const list = screen.getByRole('listbox');
    list.focus();
    expect(fireEvent.keyDown(list, { key, altKey: true })).toBe(false);
    expect(onMove).toHaveBeenCalledExactlyOnceWith(...expected);
  });

  it('moves the selected stable id when its option is focused', () => {
    const onMove = vi.fn();
    render(<SlideRail slides={slides} slideIds={slideIds} selectedId={40} onSelect={vi.fn()} total={3} onMove={onMove} />);
    const option = screen.getAllByRole('option')[1];
    option.focus();
    fireEvent.keyDown(option, { key: 'ArrowDown', altKey: true });
    expect(onMove).toHaveBeenCalledExactlyOnceWith(40, 2);
  });

  it.each([
    { selectedId: 10, key: 'ArrowUp' }, { selectedId: 70, key: 'ArrowDown' },
    { selectedId: null, key: 'ArrowDown' },
  ])('does not move beyond an end or without selection ($selectedId, $key)', ({ selectedId, key }) => {
    const onMove = vi.fn();
    render(<SlideRail slides={slides} slideIds={slideIds} selectedId={selectedId} onSelect={vi.fn()} total={3} onMove={onMove} />);
    fireEvent.keyDown(screen.getByRole('listbox'), { key, altKey: true });
    expect(onMove).not.toHaveBeenCalled();
  });

  it('leaves normal arrows for the single workspace navigation listener', () => {
    const onMove = vi.fn();
    const next = vi.fn();
    render(<div onKeyDown={event => navigateSlides(event, { next, previous: vi.fn(), first: vi.fn(), last: vi.fn() })}>
      <SlideRail slides={slides} slideIds={slideIds} selectedId={40} onSelect={vi.fn()} total={3} onMove={onMove} />
    </div>);
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowDown' });
    expect(next).toHaveBeenCalledOnce();
    expect(onMove).not.toHaveBeenCalled();
  });

  it('keeps unchanged thumbnail visuals memoized across drag state and new move callbacks', () => {
    const credited = { ...slides[0], imageMetadata: {
      source: 'nasa' as const, nasaId: 'roots', assetUrl: 'https://images-assets.nasa.gov/image/roots/roots.jpg',
      rendition: 'large' as const, mimeType: 'image/jpeg' as const,
    } };
    const props = { slideIds, selectedId: 40, onSelect: vi.fn(), total: 3 };
    const { rerender } = render(<SlideRail {...props} slides={[credited, slides[1], slides[2]]} onMove={vi.fn()} />);
    views.mockClear();
    fireEvent.dragStart(screen.getAllByRole('option')[0]);
    fireEvent.dragOver(screen.getAllByRole('option')[2]);
    expect(views).not.toHaveBeenCalled();
    rerender(<SlideRail {...props} slides={[{ ...credited }, { ...slides[1], title: 'Edited leaves' }, slides[2]]} onMove={vi.fn()} />);
    expect(views).toHaveBeenCalledOnce();
    expect(views.mock.calls[0][0].slide.title).toBe('Edited leaves');
  });
});
