// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useSlideDeck } from '@/lib/deck/use-slide-deck';
import { DEFAULT_THEME_ID } from '@/lib/themes';
import { THEME_PREFERENCE_KEY } from '@/lib/themes/preference';
import { TEST_THEME } from '../../helpers/test-theme';
import { suggestSplitIndex } from '@/lib/slide-split';
import * as split from '@/lib/slide-split';
vi.mock('@/lib/themes', async () => (await import('../../helpers/test-theme')).themeModuleWithTestLook());
const deck = { subject: 'Science', topic: 'Water', originalWriters: 'Teacher', slides: [
  { slideNumber: 1, part: 'Title Page', title: 'Water', contentPoints: ['Grade 7'], visualDescription: '' },
  { slideNumber: 2, part: 'Discussion', title: 'Evidence', contentPoints: Array.from({ length: 6 }, () => 'Record the water changes and compare evidence.'), visualDescription: '' },
] };
beforeEach(() => { localStorage.clear(); vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {}))); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('defaults to Classic and ignores unsupported IDs without writing preferences', () => {
  const { result } = renderHook(() => useSlideDeck());
  expect(result.current.themeId).toBe(DEFAULT_THEME_ID);
  act(() => result.current.setThemeId('unknown'));
  expect(result.current.themeId).toBe(DEFAULT_THEME_ID);
  expect(localStorage.getItem(THEME_PREFERENCE_KEY)).toBeNull();
});
it('shares the look across session loading/switching and does not request generation on change', () => {
  const { result } = renderHook(() => useSlideDeck());
  act(() => { result.current.loadPresentation(deck, 'Session 1'); });
  act(() => result.current.setThemeId(TEST_THEME.id));
  expect(result.current.theme).toBe(TEST_THEME);
  expect(localStorage.getItem(THEME_PREFERENCE_KEY)).toBe(TEST_THEME.id);
  expect(fetch).toHaveBeenCalledTimes(1);
  act(() => result.current.loadPresentation(deck, 'Session 2'));
  act(() => result.current.switchSession('Session 1'));
  expect(result.current.themeId).toBe(TEST_THEME.id);
});
it('seeds new workspaces from the preference and resets a lesson to the current remembered preference', () => {
  localStorage.setItem(THEME_PREFERENCE_KEY, TEST_THEME.id);
  const { result } = renderHook(() => useSlideDeck());
  expect(result.current.themeId).toBe(TEST_THEME.id);
  act(() => result.current.loadPresentation(deck));
  localStorage.setItem(THEME_PREFERENCE_KEY, DEFAULT_THEME_ID);
  // External preference changes do not mutate an active lesson.
  expect(result.current.themeId).toBe(TEST_THEME.id);
  act(() => result.current.reset());
  expect(result.current.themeId).toBe(DEFAULT_THEME_ID);
  expect(result.current.presentationData).toBeNull();
});
it('falls back on invalid stored IDs and tolerates reads/writes being blocked', () => {
  localStorage.setItem(THEME_PREFERENCE_KEY, 'bad');
  const { result, unmount } = renderHook(() => useSlideDeck());
  expect(result.current.themeId).toBe(DEFAULT_THEME_ID); unmount();
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  const blocked = renderHook(() => useSlideDeck());
  expect(blocked.result.current.themeId).toBe(DEFAULT_THEME_ID);
  act(() => blocked.result.current.setThemeId(TEST_THEME.id));
  expect(blocked.result.current.themeId).toBe(TEST_THEME.id);
  act(() => blocked.result.current.reset());
  expect(blocked.result.current.themeId).toBe(DEFAULT_THEME_ID);
});
it('uses the active theme when splitting, including a set and split in the same event', () => {
  const spy = vi.spyOn(split, 'suggestSplitIndex');
  const { result } = renderHook(() => useSlideDeck());
  act(() => result.current.loadPresentation(deck));
  const at = suggestSplitIndex(deck.slides[1], 1, deck.originalWriters, TEST_THEME)!;
  act(() => { result.current.setThemeId(TEST_THEME.id); result.current.splitSlideToFit(result.current.slideIds[1]); });
  expect(result.current.presentationData!.slides[1].contentPoints).toEqual(deck.slides[1].contentPoints.slice(0, at));
  expect(result.current.themeId).toBe(TEST_THEME.id);
  expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Evidence' }), 1, 'Teacher', TEST_THEME);
  spy.mockRestore();
});
