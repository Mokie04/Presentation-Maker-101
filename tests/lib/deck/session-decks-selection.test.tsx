// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { initialSessionDecksState, sessionDecksReducer, type SessionDecksAction, type SessionDecksState } from '@/lib/deck/session-decks-reducer';
import { useSlideDeck } from '@/lib/deck/use-slide-deck';
import type { PresentationData } from '@/types/presentation';

// Selection in production lives in the session deck reducer (reconcileSelection runs inside it), not in a
// standalone hook. These tests cover the behaviour the removed useSlideSelection hook used to be tested for.
// Blank visual descriptions mean loading a deck makes no picture requests.
const presentation = (count: number): PresentationData => ({
  subject: 'Science', originalWriters: 'Teacher', topic: 'Plants',
  slides: Array.from({ length: count }, (_, index) => ({
    slideNumber: index + 1, part: 'Discussion', title: `Slide ${index + 1}`, contentPoints: [`Point ${index + 1}`], visualDescription: '',
  })),
});
const run = (state: SessionDecksState, ...actions: SessionDecksAction[]) => actions.reduce(sessionDecksReducer, state);
const load = (count = 3, state = initialSessionDecksState) => run(state, { type: 'sessionLoaded', session: 'Session 1', presentation: presentation(count) });
const selected = (state: SessionDecksState) => state.decks['Session 1']?.selectedId;
const ids = (state: SessionDecksState) => state.decks['Session 1']!.deck.slides.map((slide) => slide.id);
const deck = (action: Extract<SessionDecksAction, { type: 'deckAction' }>['action']): SessionDecksAction => ({ type: 'deckAction', action });
const select = (selectedId: number): SessionDecksAction => ({ type: 'selectionChanged', selectedId });

describe('selection in the session deck reducer', () => {
  it('selects the first slide after load and after a reload', () => {
    expect(selected(initialSessionDecksState)).toBeUndefined();
    let state = load();
    expect(ids(state)).toEqual([0, 1, 2]);
    expect(selected(state)).toBe(0);
    state = run(state, select(1));
    expect(selected(state)).toBe(1);
    state = load(2, state);
    expect(ids(state)).toEqual([3, 4]);
    expect(selected(state)).toBe(3);
  });

  it('keeps the selection when edits leave the slide ids unchanged', () => {
    const state = run(load(), select(1), deck({ type: 'bulletUpdated', slideId: 1, bulletIndex: 0, text: 'Edited' }),
      deck({ type: 'titleUpdated', slideId: 2, title: 'Another edit' }));
    expect(selected(state)).toBe(1);
  });

  it('selects the neighbour after deleting the selected slide, then clears the empty deck', () => {
    let state = run(load(), select(1), deck({ type: 'slideDeleted', slideId: 1 }));
    expect(selected(state)).toBe(2);
    state = run(state, deck({ type: 'slideDeleted', slideId: 2 }));
    expect(selected(state)).toBe(0);
    state = run(state, deck({ type: 'slideDeleted', slideId: 0 }));
    expect(selected(state)).toBeNull();
  });

  it('selects the new slide after add and delete operations in a row', () => {
    const state = run(load(), select(1), deck({ type: 'slideAdded', afterSlideId: 2 }), deck({ type: 'slideDeleted', slideId: 0 }));
    expect(ids(state)).toEqual([1, 2, 3]);
    expect(selected(state)).toBe(3);
  });

  it('ignores selecting an id that is absent from the deck', () => {
    const state = load(2);
    expect(run(state, select(99))).toBe(state);
    expect(selected(run(state, select(99)))).toBe(0);
  });

  it('keeps the moved slide selected and selects a duplicate and an inserted slide', () => {
    let state = run(load(), select(1), deck({ type: 'slideMoved', slideId: 1, toIndex: 0 }));
    expect(ids(state)).toEqual([1, 0, 2]);
    expect(selected(state)).toBe(1);
    state = run(state, deck({ type: 'slideDuplicated', slideId: 1 }));
    expect(selected(state)).toBe(3);
    state = run(state, deck({ type: 'slideAdded', afterSlideId: 0 }));
    expect(selected(state)).toBe(4);
  });

  it('keeps each session selection when switching sessions', () => {
    let state = run(load(3), select(2));
    state = run(state, { type: 'sessionLoaded', session: 'Session 2', presentation: presentation(2) });
    expect(state.decks['Session 2']?.selectedId).toBe(3);
    state = run(state, { type: 'sessionSwitched', session: 'Session 1' });
    expect(selected(state)).toBe(2);
  });
});

describe('selection navigation through useSlideDeck', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
  const open = (count = 3) => {
    vi.stubGlobal('fetch', vi.fn(() => { throw new Error('No picture request is expected for blank visuals'); }));
    const hook = renderHook(() => useSlideDeck());
    act(() => hook.result.current.loadPresentation(presentation(count), 'Session 1'));
    return hook.result;
  };

  it('navigates repeatedly in one batch and stops at both ends', () => {
    const result = open();
    expect(result.current.selection.selectedId).toBe(0);
    act(() => { result.current.selection.previous(); });
    expect(result.current.selection.selectedId).toBe(0);
    act(() => { result.current.selection.next(); result.current.selection.next(); result.current.selection.next(); });
    expect(result.current.selection.selectedId).toBe(2);
    act(() => { result.current.selection.previous(); });
    expect(result.current.selection.selectedId).toBe(1);
    act(() => { result.current.selection.first(); });
    expect(result.current.selection.selectedId).toBe(0);
    act(() => { result.current.selection.last(); });
    expect(result.current.selection.selectedId).toBe(2);
  });

  it('ignores selecting a slide that is not in the deck', () => {
    const result = open(2);
    act(() => result.current.selection.selectSlide(99));
    expect(result.current.selection.selectedId).toBe(0);
    act(() => result.current.selection.selectSlide(1));
    expect(result.current.selection.selectedId).toBe(1);
  });
});
