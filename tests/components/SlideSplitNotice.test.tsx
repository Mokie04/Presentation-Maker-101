// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { SlideFitNotice } from '@/components/workspace/SlideFitNotice';
import { SlideStage } from '@/components/workspace/SlideStage';
import { SlideSorter } from '@/components/workspace/SlideSorter';
import type { SlideData } from '@/types/presentation';
afterEach(cleanup);
const slide: SlideData = { slideNumber: 2, part: 'Discussion', title: 'Water', contentPoints: ['Evidence '.repeat(1000), 'Observe'], visualDescription: '' };
it.each([
  { title: false, body: true }, { title: true, body: false }, { title: true, body: true },
])('renders the right overflow messages for $title/$body', overflow => {
  const split = vi.fn(); render(<SlideFitNotice overflow={overflow} onSplit={split} />);
  expect(Boolean(screen.queryByText('Some text does not fit on this slide. Shorten it, or split the slide.'))).toBe(overflow.body);
  expect(Boolean(screen.queryByText('The title is too long for the slide. Shorten it.'))).toBe(overflow.title);
  const button = screen.queryByRole('button', { name: 'Split into two slides' });
  expect(Boolean(button)).toBe(overflow.body);
  if (button) { fireEvent.click(button); expect(split).toHaveBeenCalledOnce(); }
});
it('does not show a split button without a handler or a notice when everything fits', () => {
  const view = render(<SlideFitNotice overflow={{ title: false, body: true }} />);
  expect(screen.queryByRole('button')).toBeNull();
  view.rerender(<SlideFitNotice overflow={{ title: false, body: false }} onSplit={vi.fn()} />);
  expect(screen.queryByRole('note')).toBeNull();
});
it.each([{ index: 0, contentPoints: slide.contentPoints }, { index: 1, contentPoints: [slide.contentPoints[0]] }])('never offers split for title or single-bullet slides: $index', ({ index, contentPoints }) => {
  render(<SlideStage slide={{ ...slide, contentPoints }} index={index} total={2} onSplit={vi.fn()} />);
  expect(screen.getByRole('note')).toBeTruthy(); expect(screen.queryByRole('button', { name: 'Split into two slides' })).toBeNull();
});
it('adds a visible and accessible sorter marker and removes it when text fits', () => {
  const show = (current: SlideData) => <SlideSorter slides={[{ ...slide, contentPoints: ['Science'] }, current]} slideIds={[0, 1]} selectedId={1}
    onSelect={vi.fn()} onOpen={vi.fn()} onMove={vi.fn()} onDuplicate={vi.fn()} onDelete={vi.fn()} />;
  const view = render(show(slide));
  const card = screen.getByRole('listitem', { name: 'Slide 2: Water (text does not fit)' });
  expect(within(card).getByText('!')).toBeTruthy();
  view.rerender(show({ ...slide, contentPoints: ['Water'] }));
  expect(screen.getByRole('listitem', { name: 'Slide 2: Water' })).toBeTruthy(); expect(screen.queryByText('!')).toBeNull();
});
