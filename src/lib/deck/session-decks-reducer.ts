import type { PresentationData } from '@/types/presentation';
import type { SessionOption } from '@/lib/utils/session-options';
import { SESSION_OPTIONS } from '@/lib/utils/session-options';
import { deckReducer, initialDeckState } from './deck-reducer';
import type { DeckAction, DeckState } from './types';
import { reconcileSelection } from './use-slide-selection';

export interface SessionDeck {
  deck: DeckState;
  selectedId: number | null;
  view: 'normal' | 'sorter';
}
export interface SessionDecksState {
  decks: Partial<Record<SessionOption, SessionDeck>>;
  activeSession: SessionOption | null;
  nextSlideId: number;
}
export const initialSessionDecksState: SessionDecksState = { decks: {}, activeSession: null, nextSlideId: 0 };

export type SessionDecksAction =
  | { type: 'sessionLoaded'; session: SessionOption; presentation: PresentationData }
  | { type: 'sessionSwitched'; session: SessionOption }
  | { type: 'selectionChanged'; selectedId: number | null }
  | { type: 'viewChanged'; view: SessionDeck['view'] }
  | { type: 'deckAction'; action: DeckAction }
  | { type: 'reset' };

export function sessionDecksReducer(state: SessionDecksState, action: SessionDecksAction): SessionDecksState {
  if (action.type === 'reset') return { ...initialSessionDecksState, nextSlideId: state.nextSlideId };
  if (action.type === 'sessionLoaded') {
    const deck = deckReducer({ ...initialDeckState, nextSlideId: state.nextSlideId }, {
      type: 'presentationLoaded', presentation: action.presentation,
    });
    return { decks: { ...state.decks, [action.session]: { deck, selectedId: deck.slides[0]?.id ?? null, view: 'normal' } },
      activeSession: action.session, nextSlideId: deck.nextSlideId };
  }
  if (action.type === 'sessionSwitched') {
    return state.decks[action.session] && action.session !== state.activeSession ? { ...state, activeSession: action.session } : state;
  }
  const active = state.activeSession && state.decks[state.activeSession];
  if (action.type === 'selectionChanged' || action.type === 'viewChanged') {
    if (!active || !state.activeSession) return state;
    if (action.type === 'selectionChanged' && (action.selectedId === active.selectedId ||
      !active.deck.slides.some(s => s.id === action.selectedId))) return state;
    if (action.type === 'viewChanged' && action.view === active.view) return state;
    const next = action.type === 'selectionChanged' ? { ...active, selectedId: action.selectedId } : { ...active, view: action.view };
    return { ...state, decks: { ...state.decks, [state.activeSession]: next } };
  }

  const edit = action.action;
  // Async results find their owners by globally unique IDs, never the active session.
  const targets = edit.type === 'batchImagesResolved' ? SESSION_OPTIONS :
    'token' in edit ? SESSION_OPTIONS.filter(session => state.decks[session]?.deck.slides.some(s => s.id === edit.token.slideId)) :
    'slideId' in edit ? SESSION_OPTIONS.filter(session => state.decks[session]?.deck.slides.some(s => s.id === edit.slideId)) :
    state.activeSession ? [state.activeSession] : [];
  let next = state;
  for (const session of targets) {
    const entry = next.decks[session];
    if (!entry) continue;
    const seeded = { ...entry.deck, nextSlideId: next.nextSlideId };
    const deck = deckReducer(seeded, edit);
    if (deck === seeded) continue;
    const split = edit.type === 'slideSplit' ? { slideId: edit.slideId, insertedId: next.nextSlideId } : undefined;
    const selectedId = reconcileSelection(entry.deck.slides.map(s => s.id), deck.slides.map(s => s.id), entry.selectedId, split);
    next = { ...next, nextSlideId: deck.nextSlideId,
      decks: { ...next.decks, [session]: { ...entry, deck, selectedId } } };
  }
  return next;
}
