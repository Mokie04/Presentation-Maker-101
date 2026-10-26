// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { openWorkspace, selectSlide, stage } from '../helpers/workspace';
import { TEST_THEME } from '../helpers/test-theme';
import * as fit from '@/lib/slide-fit';
import * as split from '@/lib/slide-split';
vi.mock('@/lib/themes', async () => (await import('../helpers/test-theme')).themeModuleWithTestLook());
const deck = { subject: 'Science', originalWriters: 'Teacher', topic: 'Water', slides: [
  { slideNumber: 1, title: 'Water', part: 'Title Page', contentPoints: ['Science'], visualDescription: '' },
  { slideNumber: 2, title: 'Observe water', part: 'Discussion', contentPoints: Array.from({ length: 8 }, () => 'Record water changes and compare the evidence in your classroom.'), visualDescription: 'Water diagram' },
] };
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn((url: string) => Promise.resolve(Response.json(url === '/api/generate' ? deck : url === '/api/generate-images' ? { images: {} } : { authenticated: true }))));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function choose(name: string) {
  fireEvent.click(screen.getByRole('button', { name: /^Look:/ }));
  fireEvent.click(screen.getByRole('radio', { name }));
}
it('restyles rail/stage/sorter/slideshow instantly and switching back restores exact stage markup', async () => {
  await openWorkspace(); selectSlide(2);
  const markup = stage().innerHTML;
  const callsBefore = vi.mocked(fetch).mock.calls.length;
  choose(TEST_THEME.name);
  expect(vi.mocked(fetch).mock.calls.length).toBe(callsBefore);
  expect((stage().querySelector('[role="group"]') as HTMLElement).style.backgroundColor).toBe('rgb(255, 247, 237)');
  expect((stage().querySelector('[role="group"]') as HTMLElement).style.fontFamily).toBe('Arial, sans-serif');
  for (const thumbnail of Array.from(screen.getByRole('listbox').querySelectorAll<HTMLElement>('[role="group"]'))) expect(thumbnail.style.backgroundColor).toBe('rgb(255, 247, 237)');
  choose('Sayuna Classic'); expect(stage().innerHTML).toBe(markup);
  choose(TEST_THEME.name);
  fireEvent.click(screen.getByRole('button', { name: 'Slide sorter' }));
  for (const thumbnail of Array.from(screen.getByRole('region', { name: 'Slide sorter' }).querySelectorAll<HTMLElement>('[role="group"]'))) expect(thumbnail.style.backgroundColor).toBe('rgb(255, 247, 237)');
  fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
  const modal = screen.getByRole('dialog');
  expect((modal.querySelector('[role="group"][aria-label^="Slide "]') as HTMLElement).style.backgroundColor).toBe('rgb(255, 247, 237)');
});
it('uses the active theme for overflow notices and Split decisions throughout the workspace', async () => {
  const overflow = vi.spyOn(fit, 'getSlideOverflow');
  const suggest = vi.spyOn(split, 'suggestSplitIndex');
  await openWorkspace(); selectSlide(2); choose(TEST_THEME.name);
  expect(overflow.mock.calls.filter(call => call[3] === TEST_THEME).length).toBeGreaterThanOrEqual(4);
  expect(suggest).toHaveBeenCalledWith(expect.objectContaining({ title: 'Observe water' }), 1, 'Teacher', TEST_THEME);
  const buttons = screen.getAllByRole('button', { name: 'Split into two slides' });
  fireEvent.click(buttons[0]);
  expect(suggest).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Observe water' }), 1, 'Teacher', TEST_THEME);
  expect(screen.getByRole('listbox').querySelectorAll('[role="option"]')).toHaveLength(3);
});
