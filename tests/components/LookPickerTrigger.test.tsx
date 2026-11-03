// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LookPicker } from '@/components/workspace/LookPicker';
import { THEMES } from '@/lib/themes';
import { wcagContrast } from '@/lib/themes/contrast';
import tailwindConfig from '../../tailwind.config';

afterEach(cleanup);

const colors = tailwindConfig.theme!.extend!.colors as { sun: Record<string, string>; notebook: Record<string, string> };
const rgb = (hex: string) => `rgb(${[0, 2, 4].map(offset => parseInt(hex.slice(offset, offset + 2), 16)).join(', ')})`;

it('keeps the trigger text and disclosure attributes unchanged', () => {
  render(<LookPicker themeId={THEMES[0].id} onChange={() => {}} index={0} total={1} />);
  const trigger = screen.getByRole('button', { name: `Look: ${THEMES[0].name}` });
  expect(trigger.textContent).toBe(`Look: ${THEMES[0].name}`);
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  expect(trigger.hasAttribute('aria-controls')).toBe(false);
  fireEvent.click(trigger);
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  expect(trigger.getAttribute('aria-controls')).toBe(screen.getByRole('radiogroup', { name: 'Look' }).closest('[data-look-popover]')!.id);
});

it.each(THEMES.map(theme => [theme.name, theme] as const))('shows an aria-hidden swatch in the %s colours', (_name, theme) => {
  render(<LookPicker themeId={theme.id} onChange={() => {}} index={0} total={1} />);
  const swatch = screen.getByRole('button', { name: `Look: ${theme.name}` }).querySelector<HTMLElement>('[data-look-swatch]')!;
  expect(swatch.getAttribute('aria-hidden')).toBe('true');
  expect(swatch.style.backgroundColor).toBe(rgb(theme.palette.background));
  expect((swatch.firstElementChild as HTMLElement).style.backgroundColor).toBe(rgb(theme.palette.primary));
});

it('uses the sun token with navy text at WCAG AA contrast', () => {
  render(<LookPicker themeId={THEMES[0].id} onChange={() => {}} index={0} total={1} />);
  const classes = screen.getByRole('button', { name: /Look:/ }).className.split(/\s+/);
  expect(classes).toEqual(expect.arrayContaining(['bg-sun-500', 'text-notebook-navy']));
  expect(wcagContrast(colors.notebook.navy.slice(1), colors.sun['500'].slice(1))).toBeGreaterThanOrEqual(4.5);
});

it('drops the lift and press transforms under reduced motion and keeps the focus ring', () => {
  render(<LookPicker themeId={THEMES[0].id} onChange={() => {}} index={0} total={1} />);
  const classes = screen.getByRole('button', { name: /Look:/ }).className.split(/\s+/);
  expect(classes).toEqual(expect.arrayContaining(['motion-reduce:!transform-none', 'motion-reduce:transition-none',
    'focus-visible:ring-sky-800', 'focus-visible:ring-offset-white', 'min-h-11']));
});
