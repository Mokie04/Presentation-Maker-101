// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { SlideActions } from '@/components/workspace/SlideActions';
afterEach(cleanup);
const handlers = () => ({ onMove: vi.fn(), onDuplicate: vi.fn(), onAdd: vi.fn(), onDelete: vi.fn() });
it('moves, duplicates, adds and deletes the selected stable id', () => {
  const props = handlers();
  render(<SlideActions slideId={45} index={1} total={3} {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Move slide 2 earlier' }));
  fireEvent.click(screen.getByRole('button', { name: 'Move slide 2 later' }));
  fireEvent.click(screen.getByRole('button', { name: 'Duplicate slide' }));
  fireEvent.click(screen.getByRole('button', { name: '+ Add Slide' }));
  fireEvent.click(screen.getByRole('button', { name: 'Delete Slide' }));
  expect(props.onMove.mock.calls).toEqual([[45, 0], [45, 2]]);
  expect(props.onDuplicate).toHaveBeenCalledWith(45);
  expect(props.onAdd).toHaveBeenCalledWith();
  expect(props.onDelete).toHaveBeenCalledWith(45);
});
it('disables moves beyond the first and last slide', () => {
  const props = handlers();
  const { rerender } = render(<SlideActions slideId={45} index={0} total={3} {...props} />);
  expect(screen.getByRole('button', { name: 'Move slide 1 earlier' }).hasAttribute('disabled')).toBe(true);
  expect(screen.getByRole('button', { name: 'Move slide 1 later' }).hasAttribute('disabled')).toBe(false);
  rerender(<SlideActions slideId={45} index={2} total={3} {...props} />);
  expect(screen.getByRole('button', { name: 'Move slide 3 earlier' }).hasAttribute('disabled')).toBe(false);
  expect(screen.getByRole('button', { name: 'Move slide 3 later' }).hasAttribute('disabled')).toBe(true);
});
it('keeps the only slide and explains why deletion is unavailable', () => {
  const props = handlers();
  render(<SlideActions slideId={31} index={0} total={1} {...props} />);
  const remove = screen.getByRole('button', { name: 'Delete Slide' });
  expect(remove.hasAttribute('disabled')).toBe(true);
  expect(remove.getAttribute('title')).toBe('Keep at least one slide');
  fireEvent.click(remove);
  expect(props.onDelete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '+ Add Slide' }));
  expect(props.onAdd).toHaveBeenCalledWith();
});
it('puts the danger-styled Delete last, apart from the other actions', () => {
  render(<SlideActions slideId={45} index={1} total={3} {...handlers()} />);
  const toolbar = screen.getByRole('toolbar', { name: 'Slide actions' });
  const names = ['Move slide 2 earlier', 'Move slide 2 later', 'Duplicate slide', '+ Add Slide', 'Delete Slide'];
  expect(within(toolbar).getAllByRole('button')).toEqual(names.map(name => within(toolbar).getByRole('button', { name })));
  const remove = within(toolbar).getByRole('button', { name: 'Delete Slide' });
  expect(remove.classList.contains('text-rose-700')).toBe(true);
  // The other actions share a group; Delete sits outside it, at the far end.
  const group = within(toolbar).getByRole('button', { name: '+ Add Slide' }).parentElement!;
  expect(group).not.toBe(toolbar);
  expect(group.contains(remove)).toBe(false);
});
