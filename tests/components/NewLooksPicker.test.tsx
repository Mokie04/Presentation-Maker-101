// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LookPicker } from '@/components/workspace/LookPicker';
const slide = { slideNumber: 1, part: 'Title Page', title: 'Water', contentPoints: ['Science'], visualDescription: '' };
afterEach(cleanup);
it('shows the real three-look registry and closes without changing anything when the already-selected look is chosen', () => {
  const onChange = vi.fn();
  render(<LookPicker themeId="sayuna-classic" onChange={onChange} slide={slide} index={0} total={1} />);
  const trigger = screen.getByRole('button', { name: 'Look: Sayuna Classic' });
  fireEvent.click(trigger);
  expect(screen.getAllByRole('radio')).toHaveLength(3);
  for (const name of ['Sayuna Classic', 'Chalkboard', 'Paper Notebook']) expect(screen.getByRole('radio', { name })).toBeTruthy();
  fireEvent.click(screen.getByRole('radio', { name: 'Sayuna Classic' }));
  expect(screen.queryByRole('radiogroup')).toBeNull();
  expect(document.activeElement).toBe(trigger);
  // Choosing the look that is already active is not a change: no update, no preference write.
  expect(onChange).not.toHaveBeenCalled();
  // Choosing a different look does change it, once.
  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole('radio', { name: 'Chalkboard' }));
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onChange).toHaveBeenCalledWith('chalkboard');
});
