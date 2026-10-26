import { describe, expect, it } from 'vitest';
import { initialSessionDecksState, sessionDecksReducer as reduce } from '@/lib/deck/session-decks-reducer';
import type { PresentationData } from '@/types/presentation';

const presentation: PresentationData = { subject: 'Science', originalWriters: 'Teacher', topic: 'Plants',
  slides: ['Roots', 'Leaves'].map((title, index) => ({ slideNumber: index + 1, title, part: 'Discussion', contentPoints: [title, 'More'], visualDescription: '' })) };
const load = (state = initialSessionDecksState, session: 'Session 1' | 'Session 2' = 'Session 1') =>
  reduce(state, { type: 'sessionLoaded', session, presentation });
const edit = (state: ReturnType<typeof load>, action: Parameters<typeof reduce>[1] & { type: 'deckAction' }) => reduce(state, action);

describe('session decks', () => {
  it('loads independently, switches, and replaces only the chosen session with fresh IDs and Normal view', () => {
    let state = load();
    state = reduce(state, { type: 'selectionChanged', selectedId: 1 });
    state = reduce(state, { type: 'viewChanged', view: 'sorter' });
    const first = state.decks['Session 1'];
    state = load(state, 'Session 2');
    expect(state.activeSession).toBe('Session 2');
    expect(state.decks['Session 1']).toBe(first);
    expect(state.decks['Session 2']!.deck.slides.map(s => s.id)).toEqual([2, 3]);
    state = reduce(state, { type: 'sessionSwitched', session: 'Session 1' });
    expect(state.decks[state.activeSession!]!.selectedId).toBe(1);
    expect(state.decks[state.activeSession!]!.view).toBe('sorter');
    const second = state.decks['Session 2'];
    state = load(state);
    expect(state.decks['Session 2']).toBe(second);
    expect(state.decks['Session 1']!.deck.slides.map(s => s.id)).toEqual([4, 5]);
    expect(state.decks['Session 1']!.selectedId).toBe(4);
    expect(state.decks['Session 1']!.view).toBe('normal');
  });

  it('uses the shared counter for add, duplicate, split, replacement and reset', () => {
    let state = load(load(), 'Session 2');
    state = edit(state, { type: 'deckAction', action: { type: 'slideAdded' } });
    state = reduce(state, { type: 'sessionSwitched', session: 'Session 1' });
    state = edit(state, { type: 'deckAction', action: { type: 'slideDuplicated', slideId: 0 } });
    state = edit(state, { type: 'deckAction', action: { type: 'slideSplit', slideId: 0, atBulletIndex: 1 } });
    expect(state.decks['Session 1']!.deck.slides.map(s => s.id)).toEqual([0, 6, 5, 1]);
    expect(state.decks['Session 2']!.deck.slides.map(s => s.id)).toEqual([2, 3, 4]);
    expect(state.decks['Session 1']!.selectedId).toBe(0);
    state = reduce(state, { type: 'reset' });
    expect(state.decks).toEqual({});
    expect(load(state).decks['Session 1']!.deck.slides[0].id).toBe(7);
  });

  it('routes batch and regeneration results to inactive decks while retaining version checks', () => {
    let state = load();
    state = edit(state, { type: 'deckAction', action: { type: 'regenerationStarted', slideId: 1 } });
    state = load(state, 'Session 2');
    const second = state.decks['Session 2'];
    state = edit(state, { type: 'deckAction', action: { type: 'batchImagesResolved', tokens: [{ slideId: 0, version: 0 }, { slideId: 1, version: 0 }], images: { 0: 'roots', 1: 'stale' } } });
    expect(state.decks['Session 1']!.deck.slides.map(s => s.image.data)).toEqual(['roots', undefined]);
    state = edit(state, { type: 'deckAction', action: { type: 'regenerationResolved', token: { slideId: 1, version: 1 }, base64: 'leaves' } });
    expect(state.decks['Session 1']!.deck.slides[1].image.data).toBe('leaves');
    expect(state.decks['Session 2']).toBe(second);
    expect(state.activeSession).toBe('Session 2');
    state = load(state);
    const replaced = state;
    state = edit(state, { type: 'deckAction', action: { type: 'regenerationFailed', token: { slideId: 1, version: 1 }, error: 'late' } });
    state = edit(state, { type: 'deckAction', action: { type: 'regenerationResolved', token: { slideId: 1, version: 1 }, base64: 'late' } });
    state = edit(state, { type: 'deckAction', action: { type: 'batchImagesResolved', tokens: [{ slideId: 0, version: 0 }], images: { 0: 'late' } } });
    expect(state).toBe(replaced);
  });

  it('ignores missing sessions and invalid selections without creating decks', () => {
    expect(reduce(initialSessionDecksState, { type: 'sessionSwitched', session: 'Session 2' })).toBe(initialSessionDecksState);
    const state = load();
    expect(reduce(state, { type: 'selectionChanged', selectedId: 999 })).toBe(state);
  });
});
