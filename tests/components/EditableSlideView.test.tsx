// @vitest-environment jsdom
import React, { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { EditableSlideView } from '@/components/workspace/EditableSlideView';
import { SlideStage } from '@/components/workspace/SlideStage';
import type { SlideData } from '@/types/presentation';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const initial = { slideNumber: 1, part: 'Discussion', title: 'H_2O', contentPoints: ['x^2', 'Second point'], visualDescription: '' };
function Harness({ index = 1, points = initial.contentPoints }: { index?: number; points?: string[] }) {
  const [slide, setSlide] = useState<SlideData>({ ...initial, contentPoints: points });
  return <EditableSlideView slide={slide} index={index} total={3} originalWriters="Maria"
    onTitleChange={title => setSlide(s => ({ ...s, title }))}
    onPointChange={(index, text) => setSlide(s => ({ ...s, contentPoints: s.contentPoints.map((p, i) => i === index ? text : p) }))}
    onPointInsert={index => setSlide(s => ({ ...s, contentPoints: [...s.contentPoints.slice(0, index + 1), '', ...s.contentPoints.slice(index + 1)] }))}
    onPointDelete={index => setSlide(s => ({ ...s, contentPoints: s.contentPoints.filter((_, i) => i !== index) }))}
    onPointAdd={() => setSlide(s => ({ ...s, contentPoints: [...s.contentPoints, 'New primary discussion point'] }))} />;
}

describe('EditableSlideView', () => {
  it('edits raw title text live and restores formulas when finished', () => {
    const { container } = render(<Harness />);
    expect(screen.getByRole('button', { name: 'Edit slide title' }).querySelector('sub')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Edit slide title' }));
    const title = screen.getByRole('textbox', { name: 'Edit slide title' }) as HTMLTextAreaElement;
    expect(title.value).toBe('H_2O');
    expect(document.activeElement).toBe(title);
    fireEvent.change(title, { target: { value: 'CO_2' } });
    fireEvent.keyDown(title, { key: 'Enter' });
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(container.querySelector('h2 sub')?.textContent).toBe('2');
    expect(screen.getByRole('heading').textContent).toBe('CO2');
  });

  it('restores the start value on Escape and finishes on blur', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit bullet 1' }));
    const field = screen.getByRole('textbox');
    fireEvent.change(field, { target: { value: 'Changed' } });
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Edit bullet 1' }).textContent).toBe('x2');
    fireEvent.click(screen.getByRole('button', { name: 'Edit bullet 2' }));
    fireEvent.blur(screen.getByRole('textbox'));
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('inserts after Enter, focuses the new empty point, and deletes it back to the previous point', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit bullet 1' }));
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    const empty = screen.getByRole('textbox', { name: 'Edit bullet 2' }) as HTMLTextAreaElement;
    expect(empty.value).toBe('');
    expect(document.activeElement).toBe(empty);
    fireEvent.keyDown(empty, { key: 'Backspace' });
    expect((screen.getByRole('textbox', { name: 'Edit bullet 1' }) as HTMLTextAreaElement).value).toBe('x^2');
    expect(screen.getByRole('button', { name: 'Edit bullet 2' }).textContent).toBe('Second point');
  });

  it('ends when deleting the first empty point and removes an empty point left on blur', () => {
    render(<Harness points={['', 'Keep']} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit bullet 1' }));
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Backspace' });
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Edit bullet 1' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } });
    fireEvent.blur(screen.getByRole('textbox'));
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Click to add a bullet' })).toBeTruthy();
  });

  it('adds a point through the existing add handler on an empty content slide', () => {
    render(<Harness points={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Click to add a bullet' }));
    expect((screen.getByRole('textbox', { name: 'Edit bullet 1' }) as HTMLTextAreaElement).value).toBe('New primary discussion point');
    expect(document.activeElement).toBe(screen.getByRole('textbox'));
  });

  it('never offers editing for the derived writers line or other slide furniture', () => {
    render(<Harness index={0} />);
    expect(screen.getByText('Original Lesson Plan Writers: Maria').closest('[role="button"]')).toBeNull();
    expect(screen.getAllByRole('button').map(button => button.getAttribute('aria-label')))
      .toEqual(['Edit slide title', 'Edit bullet 1', 'Edit bullet 2']);
  });
});

const handlers = { onTitleChange: vi.fn(), onPointChange: vi.fn(), onPointInsert: vi.fn(), onPointDelete: vi.fn(), onPointAdd: vi.fn() };
it('keeps SlideStage passive without handlers and disables editing below md', () => {
  const { rerender } = render(<SlideStage slide={initial} index={1} total={3} />);
  expect(within(screen.getByRole('region')).queryByRole('button')).toBeNull();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  rerender(<SlideStage key="mobile" slide={initial} index={1} total={3} {...handlers} />);
  expect(screen.queryByRole('button', { name: 'Edit slide title' })).toBeNull();
});

it('enables stage editing without matchMedia and responds to breakpoint changes', () => {
  let change!: (event: MediaQueryListEvent) => void;
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true,
    addEventListener: (_: string, callback: typeof change) => { change = callback; }, removeEventListener: vi.fn() })));
  render(<SlideStage slide={initial} index={1} total={3} {...handlers} />);
  expect(screen.getByRole('button', { name: 'Edit slide title' })).toBeTruthy();
  fireEvent(window, new Event('resize'));
  // The media query, not a window-size heuristic, controls editor availability.
  act(() => change({ matches: false } as MediaQueryListEvent));
  expect(screen.queryByRole('button', { name: 'Edit slide title' })).toBeNull();
});
