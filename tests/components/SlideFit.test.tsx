// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { SlideView } from '@/components/SlideView';
import { SlideRail } from '@/components/workspace/SlideRail';
import { SlideStage } from '@/components/workspace/SlideStage';
import { SlidePanel } from '@/components/workspace/SlidePanel';
import type { SlideData } from '@/types/presentation';
vi.mock('next/font/local', () => ({ default: () => ({ variable: 'poppins-variable' }) }));
afterEach(cleanup);
const slide: SlideData = { slideNumber: 2, part: 'Discussion', title: 'Water', contentPoints: ['Evidence '.repeat(1000)], visualDescription: '' };
it('shrinks dense bullets above the floor', () => {
  const { container } = render(<SlideView slide={{ ...slide, contentPoints: ['Observe the different bodies in our Solar System. '.repeat(12)] }} index={1} total={2} />);
  const size = parseFloat(container.querySelector('ul')!.style.fontSize);
  expect(size).toBeLessThan(35 / 960 * 100);
  expect(size).toBeGreaterThanOrEqual(24 / 960 * 100);
});
it.each(['full', 'thumbnail'] as const)('makes impossible %s text reachable or clipped for thumbnails', variant => {
  const { container } = render(<SlideView slide={slide} index={1} total={2} variant={variant} />);
  const box = container.querySelector('ul')!;
  expect(box.dataset.overflow).toBe('true');
  expect(box.style.justifyContent).toBe('flex-start');
  expect(box.style.overflowY).toBe(variant === 'full' ? 'auto' : 'hidden');
});
it('flags the rail, stage and panel, then removes all warnings when text fits', () => {
  const show = (current: SlideData) => <>
    <SlideRail slides={[current]} slideIds={[4]} selectedId={4} onSelect={vi.fn()} total={1} />
    <SlideStage slide={current} index={0} total={1} />
    <SlidePanel slide={current} slideIndex={0} slideId={4} onUpdateTitle={vi.fn()} onUpdateBullet={vi.fn()}
      onAddBullet={vi.fn()} onDeleteBullet={vi.fn()} onDeleteSlide={vi.fn()} onRegenerateImage={vi.fn()} onAddSlide={vi.fn()} />
  </>;
  const view = render(show(slide));
  expect(screen.getByRole('option', { name: /Slide 1: Water/ }).getAttribute('aria-label')).toContain(' (text does not fit)');
  expect(screen.getByText('!')).toBeTruthy();
  expect(screen.getAllByRole('note')).toHaveLength(2);
  view.rerender(show({ ...slide, contentPoints: ['Water'] }));
  expect(screen.getByRole('option', { name: /Slide 1: Water/ }).getAttribute('aria-label')).not.toContain('text does not fit');
  expect(screen.queryByText('!')).toBeNull();
  expect(screen.queryAllByRole('note')).toHaveLength(0);
});
