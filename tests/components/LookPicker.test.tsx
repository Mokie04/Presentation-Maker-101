// @vitest-environment jsdom
import React, { useState } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { LookPicker } from '@/components/workspace/LookPicker';
import { TEST_THEME } from '../helpers/test-theme';
const registry = vi.hoisted(() => ({ count: 2 }));
vi.mock('@/lib/themes', async () => {
  const themeModule = await (await import('../helpers/test-theme')).themeModuleWithTestLook();
  return { ...themeModule, get THEMES() { return registry.count === 1 ? [themeModule.DEFAULT_THEME] : themeModule.THEMES; } };
});
const slide = { slideNumber: 1, title: 'Water and energy', part: 'Discussion', contentPoints: ['Observe water'], visualDescription: 'Water diagram' };
function Picker() {
  const [themeId, setThemeId] = useState('sayuna-classic');
  return <main><LookPicker themeId={themeId} onChange={setThemeId} slide={slide} index={1} total={3} /><button>Outside</button></main>;
}
beforeEach(() => { registry.count = 2; });
afterEach(cleanup);
it('renders nothing with only one registered look', () => {
  registry.count = 1; render(<Picker />);
  expect(screen.queryByRole('button', { name: /Look:/ })).toBeNull();
});
it('shows named native radios, per-option live previews and PowerPoint font notes', () => {
  render(<Picker />); fireEvent.click(screen.getByRole('button', { name: 'Look: Sayuna Classic' }));
  const group = screen.getByRole('radiogroup', { name: 'Look' });
  expect(within(group).getByRole('radio', { name: 'Sayuna Classic' })).toBeInstanceOf(HTMLInputElement);
  expect(within(group).getByRole('radio', { name: 'Test Look' })).toBeInstanceOf(HTMLInputElement);
  expect(within(group).getByText('PowerPoint font: Poppins')).toBeTruthy();
  expect(within(group).getByText('PowerPoint font: Arial')).toBeTruthy();
  const previews = group.querySelectorAll('[role="group"][aria-hidden="true"]');
  expect(previews).toHaveLength(2);
  for (const preview of Array.from(previews)) expect(preview.parentElement!.hasAttribute('inert')).toBe(true);
  expect((previews[1] as HTMLElement).style.backgroundColor).toBe('rgb(255, 247, 237)');
  expect(group.closest('[data-look-popover]')!.className).toContain('fixed');
  expect(group.closest('[data-look-popover]')!.className).toContain('md:absolute');
  expect(group.closest('[data-look-popover]')!.className).toContain('md:left-0');
});
it('applies a selection immediately, closes and restores focus', () => {
  render(<Picker />); fireEvent.click(screen.getByRole('button', { name: 'Look: Sayuna Classic' }));
  fireEvent.click(screen.getByRole('radio', { name: TEST_THEME.name }));
  expect(screen.queryByRole('radiogroup')).toBeNull();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Look: Test Look' }));
});
it('closes on Escape with focus restored and on outside pointer press', () => {
  render(<Picker />); const trigger = screen.getByRole('button', { name: 'Look: Sayuna Classic' });
  fireEvent.click(trigger); fireEvent.keyDown(screen.getByRole('radio', { name: 'Sayuna Classic' }), { key: 'Escape' });
  expect(screen.queryByRole('radiogroup')).toBeNull(); expect(document.activeElement).toBe(trigger);
  fireEvent.click(trigger); fireEvent.pointerDown(screen.getByRole('button', { name: 'Outside' }));
  expect(screen.queryByRole('radiogroup')).toBeNull();
});
it('leaves arrow keys to the native radio group and handles the selection the browser then makes', () => {
  // jsdom does not implement native arrow navigation, so this pins what the browser relies on and what follows it:
  // one named group with exactly one checked radio, keys that are never intercepted, and the change an arrow key
  // produces (the browser checks the next radio and fires click and change) updating the look and closing the popover.
  const onChange = vi.fn();
  function Spy() {
    const [themeId, setThemeId] = useState('sayuna-classic');
    return <main><LookPicker themeId={themeId} onChange={id => { onChange(id); setThemeId(id); }} slide={slide} index={1} total={3} /></main>;
  }
  render(<Spy />); fireEvent.click(screen.getByRole('button', { name: /Look:/ }));
  const radios = screen.getAllByRole('radio') as HTMLInputElement[];
  expect(radios).toHaveLength(2);
  expect(new Set(radios.map(radio => radio.name)).size).toBe(1);
  expect(radios.filter(radio => radio.checked).map(radio => radio.value)).toEqual(['sayuna-classic']);
  expect(radios.every(radio => !radio.disabled)).toBe(true);
  const current = screen.getByRole('radio', { name: 'Sayuna Classic' });
  expect(current).toBe(document.activeElement);
  for (const key of ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft']) expect(fireEvent.keyDown(current, { key })).toBe(true);
  expect(onChange).not.toHaveBeenCalled();
  // What the browser does for ArrowDown: it checks the next radio, which fires click and change on it.
  fireEvent.click(screen.getByRole('radio', { name: 'Test Look' }));
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onChange).toHaveBeenCalledWith('test-look');
  expect(screen.queryByRole('radiogroup', { name: 'Look' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Look: Test Look' })).toBe(document.activeElement);
});
it('has no axe violations with the non-modal popover open (jsdom contrast excluded)', async () => {
  render(<Picker />); fireEvent.click(screen.getByRole('button', { name: /Look:/ }));
  const results = await axe.run(document.body, { rules: { 'color-contrast': { enabled: false } } });
  expect(results.violations).toEqual([]);
});
it('keeps the option mounted during pointer-induced blur so its label can activate the radio', () => {
  render(<Picker />); fireEvent.click(screen.getByRole('button', { name: /Look:/ }));
  // Pointer-down on a label can briefly move focus to body before native activation.
  fireEvent.blur(screen.getByRole('radio', { name: 'Sayuna Classic' }), { relatedTarget: null });
  expect(screen.queryByRole('radiogroup', { name: 'Look' })).toBeTruthy();
  fireEvent.click(screen.getByText('Test Look'));
  expect(screen.getByRole('button', { name: 'Look: Test Look' })).toBe(document.activeElement);
});

it('describes each radio with its PowerPoint font while naming it only from the look name', () => {
  render(<Picker />); fireEvent.click(screen.getByRole('button', { name: 'Look: Sayuna Classic' }));
  expect(screen.getByRole('radio', { name: 'Sayuna Classic', description: 'PowerPoint font: Poppins' })).toBeTruthy();
  expect(screen.getByRole('radio', { name: 'Test Look', description: 'PowerPoint font: Arial' })).toBeTruthy();
});
