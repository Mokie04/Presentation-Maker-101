// @vitest-environment jsdom
import React, { Profiler } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SlideshowModal } from '@/components/SlideshowModal';
import type { PresentationData } from '@/types/presentation';

const presentation: PresentationData = {
  subject: 'Science', originalWriters: 'Teacher', topic: 'Plants',
  slides: ['Roots', 'Leaves'].map((title, index) => ({ slideNumber: index + 1, part: 'Discussion',
    title, contentPoints: [title], visualDescription: '' })),
};
afterEach(cleanup);

it.each(['first open', 'reopen', 'shorter deck'])('commits the requested slide immediately on %s', scenario => {
  const commits: (string | null)[] = [];
  const view = (isOpen: boolean, initialIndex: number, data = presentation) => (
    <Profiler id="slideshow" onRender={() => {
      commits.push(document.querySelector('[role="dialog"] [role="status"]')?.textContent ?? null);
    }}>
      <SlideshowModal isOpen={isOpen} initialIndex={initialIndex} presentationData={data}
        onClose={vi.fn()} session="Session 1" slideImages={{}} />
    </Profiler>
  );
  const { rerender } = render(view(scenario !== 'first open', scenario === 'first open' ? 0 : 1));
  if (scenario === 'reopen') fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
  if (scenario !== 'first open') rerender(view(false, 1));
  commits.length = 0;
  const shortened = scenario === 'shorter deck';
  rerender(view(true, shortened ? 0 : 1, shortened ? { ...presentation, slides: presentation.slides.slice(0, 1) } : presentation));
  expect(commits[0]).toBe(shortened ? 'Slide 1 of 1' : 'Slide 2 of 2');
});

it('preserves index changes while open and resets the rotate hint for each new opening', () => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener() {}, removeEventListener() {} })));
  const view = (isOpen: boolean, initialIndex: number) => <SlideshowModal isOpen={isOpen} initialIndex={initialIndex}
    presentationData={presentation} onClose={vi.fn()} session="Session 1" slideImages={{}} />;
  try {
    const { rerender } = render(view(true, 0));
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss rotate hint' }));
    expect(screen.queryByText('Rotate your phone for a larger slide')).toBeNull();
    rerender(view(true, 1));
    expect(screen.getByRole('status').textContent).toBe('Slide 2 of 2');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss rotate hint' }));
    rerender(view(false, 1));
    rerender(view(true, 1));
    expect(screen.getByText('Rotate your phone for a larger slide')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('dialog'));
  } finally { vi.unstubAllGlobals(); }
});
