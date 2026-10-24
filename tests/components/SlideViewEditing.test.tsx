// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { SlideView } from '@/components/SlideView';

afterEach(cleanup);
const slide = { slideNumber: 1, part: 'Discussion', title: 'H_2O', contentPoints: ['x^2'], visualDescription: '' };

it('offers formatted title and stored points to optional wrappers in both layouts', () => {
  const renderTitle = vi.fn((title: React.ReactNode) => <span data-testid="title-wrapper">{title}</span>);
  const renderPoint = vi.fn((point: React.ReactNode, index: number, editable: boolean) =>
    <span data-testid={`point-${index}`} data-editable={editable}>{point}</span>);
  const { container, rerender } = render(<SlideView slide={slide} index={0} total={2} originalWriters="Maria"
    renderTitle={renderTitle} renderPoint={renderPoint} />);
  expect(renderTitle).toHaveBeenCalledOnce();
  expect(screen.getByTestId('title-wrapper').querySelector('sub')).toBeTruthy();
  expect(screen.getByTestId('point-0').querySelector('sup')?.textContent).toBe('2');
  expect(screen.getByTestId('point-0').getAttribute('data-editable')).toBe('true');
  expect(screen.getByTestId('point-1').getAttribute('data-editable')).toBe('false');
  expect(screen.getByTestId('point-1').textContent).toBe('Original Lesson Plan Writers: Maria');
  rerender(<SlideView slide={slide} index={1} total={2} renderTitle={renderTitle} renderPoint={renderPoint} />);
  expect(container.querySelector('li [data-testid="point-0"]')).toBeTruthy();
  expect(screen.queryByTestId('point-1')).toBeNull();
});

it('keeps the passive structure and formulas without render props', () => {
  const { container } = render(<SlideView slide={slide} index={1} total={2} />);
  expect(container.querySelector('h2 > span > sub')).toBeTruthy();
  expect(container.querySelector('ul > li > span > sup')?.textContent).toBe('2');
  expect(container.querySelectorAll('textarea, [role="button"], [tabindex]')).toHaveLength(0);
});
