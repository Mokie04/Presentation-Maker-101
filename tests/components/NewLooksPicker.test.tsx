// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LookPicker } from '@/components/workspace/LookPicker';
const slide = { slideNumber: 1, part: 'Title Page', title: 'Water', contentPoints: ['Science'], visualDescription: '' };
afterEach(cleanup);
it('shows the real three-look registry and closes when the already-selected look is chosen', () => {
  render(<LookPicker themeId="sayuna-classic" onChange={vi.fn()} slide={slide} index={0} total={1} />);
  const trigger = screen.getByRole('button', { name: 'Look: Sayuna Classic' });
  fireEvent.click(trigger);
  expect(screen.getAllByRole('radio').map(radio => radio.getAttribute('aria-label'))).toEqual(['Sayuna Classic', 'Chalkboard', 'Paper Notebook']);
  fireEvent.click(screen.getByRole('radio', { name: 'Sayuna Classic' }));
  expect(screen.queryByRole('radiogroup')).toBeNull();
  expect(document.activeElement).toBe(trigger);
});
