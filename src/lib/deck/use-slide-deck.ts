'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { ImageMetadata } from '@/lib/image-metadata';
import type { PresentationData } from '@/types/presentation';
import { initialDeckState } from './deck-reducer';
import { initialSessionDecksState, sessionDecksReducer } from './session-decks-reducer';
import type { SessionDecksAction } from './session-decks-reducer';
import { SESSION_OPTIONS, type SessionOption } from '@/lib/utils/session-options';
import { firstSlideId, lastSlideId, nextSlideId, previousSlideId } from './use-slide-selection';
import { toGeneratingFlags, toPresentationData, toSlideImages } from './selectors';
import { getTheme, isThemeId } from '@/lib/themes';
import { readThemePreference, rememberThemePreference } from '@/lib/themes/preference';
import { suggestSplitIndex } from '@/lib/slide-split';
import type { SplitSelection } from './use-slide-selection';
import type { DeckAction, ImageToken } from './types';

export function useSlideDeck() {
  const [themeId, updateThemeId] = useState(readThemePreference);
  const theme = getTheme(themeId);
  const themeRef = useRef(theme);
  const setThemeId = (id: string) => {
    if (!isThemeId(id)) return;
    themeRef.current = getTheme(id);
    updateThemeId(id);
    rememberThemePreference(id);
  };
  const [sessionsState, setSessionsState] = useState(initialSessionDecksState);
  // Synchronous state is essential when several edits/load operations precede a render.
  const sessionsRef = useRef(sessionsState);
  const splitSelection = useRef<SplitSelection>();
  const state = sessionsState.activeSession ? sessionsState.decks[sessionsState.activeSession]!.deck : initialDeckState;
  const stateRef = useRef(state);

  const dispatchSession = useCallback((action: SessionDecksAction) => {
    const next = sessionDecksReducer(sessionsRef.current, action);
    sessionsRef.current = next;
    stateRef.current = next.activeSession ? next.decks[next.activeSession]!.deck : initialDeckState;
    setSessionsState(next);
    return stateRef.current;
  }, []);

  const dispatch = useCallback((action: DeckAction) => {
    const previous = stateRef.current;
    const next = dispatchSession({ type: 'deckAction', action });
    if (action.type === 'slideSplit' && next !== previous) {
      splitSelection.current = { slideId: action.slideId, insertedId: sessionsRef.current.nextSlideId - 1 };
    }
    return next;
  }, [dispatchSession]);

  const presentationData = useMemo(() => toPresentationData(state), [state]);
  const slideImages = useMemo(() => toSlideImages(state), [state]);
  const generatingImages = useMemo(() => toGeneratingFlags(state), [state]);
  const slideIds = useMemo(() => state.slides.map((slide) => slide.id), [state]);
  const imageErrors = useMemo(() => {
    const errors: Record<number, string> = {};
    state.slides.forEach(({ image }, index) => {
      if (image.error) errors[index] = image.error;
    });
    return errors;
  }, [state]);

  // Background batch image generation for eligible slides
  const loadPresentation = (data: PresentationData, session: SessionOption = 'Session 1') => {
    dispatchSession({ type: 'sessionLoaded', session, presentation: data });
    const tokens: ImageToken[] = stateRef.current.slides.map((s) => ({ slideId: s.id, version: s.image.version }));
    const slidesForBatch = data.slides.map((s, index) => ({
      slideIndex: index,
      part: s.part,
      visualDescription: s.visualDescription,
    })).filter(slide => slide.visualDescription.trim().length > 0);

    fetch('/api/generate-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slides: slidesForBatch }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          throw new Error(errText || 'Batch image generation failed');
        }
        return res.json();
      })
      .then((result) => {
        if (result?.images) dispatch({ type: 'batchImagesResolved', tokens, images: result.images });
      })
      .catch((err) => {
        console.error('Batch image generation error:', err);
      });
  };

  // Single slide image generation / regeneration
  const regenerateImage = async (slideId: number, visualDescription: string) => {
    const slideIndex = stateRef.current.slides.findIndex((s) => s.id === slideId);
    if (slideIndex === -1) return;
    dispatch({ type: 'regenerationStarted', slideId });
    const version = stateRef.current.slides.find((s) => s.id === slideId)!.image.version;
    const token: ImageToken = { slideId, version };
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // The version rises with every Image intent, so each regenerate asks for a different photo.
        body: JSON.stringify({ prompt: visualDescription, slideIndex, variation: token.version }),
      });
      const resText = await res.text();
      let data: { base64?: string; error?: string } = {};
      try {
        data = JSON.parse(resText) as { base64?: string; error?: string };
      } catch {
        throw new Error(resText.slice(0, 120) || 'Failed to parse image response');
      }
      if (!res.ok || !data.base64) {
        throw new Error(data.error || 'Failed to render image.');
      }
      dispatch({ type: 'regenerationResolved', token, base64: data.base64 });
    } catch (err) {
      console.error('Image regeneration failed:', err);
      dispatch({ type: 'regenerationFailed', token, error: err instanceof Error ? err.message : 'Failed to render image.' });
    }
  };

  const splitSlide = (slideId: number, atBulletIndex: number): boolean => {
    const previous = stateRef.current;
    return dispatch({ type: 'slideSplit', slideId, atBulletIndex }) !== previous;
  };
  const splitSlideToFit = (slideId: number): boolean => {
    const current = stateRef.current;
    const index = current.slides.findIndex(slide => slide.id === slideId);
    if (index === -1) return false;
    const { content, image } = current.slides[index];
    const atBulletIndex = suggestSplitIndex({ ...content, imageMetadata: image.metadata }, index, current.presentation?.originalWriters, themeRef.current);
    return atBulletIndex !== null && splitSlide(slideId, atBulletIndex);
  };

  const active = sessionsState.activeSession ? sessionsState.decks[sessionsState.activeSession]! : null;
  const selectSlide = (selectedId: number | null) => dispatchSession({ type: 'selectionChanged', selectedId });
  const navigate = (find: typeof nextSlideId) => {
    const current = stateRef.current;
    const session = sessionsRef.current.activeSession;
    selectSlide(find(current.slides.map(s => s.id), session ? sessionsRef.current.decks[session]!.selectedId : null));
  };

  return {
    themeId, theme, setThemeId,
    activeSession: sessionsState.activeSession,
    sessions: SESSION_OPTIONS.filter(session => sessionsState.decks[session]),
    switchSession: (session: SessionOption) => dispatchSession({ type: 'sessionSwitched', session }),
    view: active?.view ?? 'normal',
    setView: (view: 'normal' | 'sorter') => dispatchSession({ type: 'viewChanged', view }),
    selection: {
      selectedId: active?.selectedId ?? null,
      selectSlide,
      next: () => navigate(nextSlideId),
      previous: () => navigate(previousSlideId),
      first: () => navigate(firstSlideId),
      last: () => navigate(lastSlideId),
    },
    splitSlide,
    splitSlideToFit,
    splitSelection: splitSelection.current,
    presentationData,
    slideImages,
    generatingImages,
    imageErrors,
    slideIds,
    loadPresentation,
    reset: () => { setThemeId(readThemePreference()); dispatchSession({ type: 'reset' }); },
    updatePart: (slideId: number, part: string) => dispatch({ type: 'partUpdated', slideId, part }),
    updateTitle: (slideId: number, title: string) => dispatch({ type: 'titleUpdated', slideId, title }),
    updateBullet: (slideId: number, bulletIndex: number, text: string) =>
      dispatch({ type: 'bulletUpdated', slideId, bulletIndex, text }),
    addBullet: (slideId: number) => dispatch({ type: 'bulletAdded', slideId }),
    insertBullet: (slideId: number, afterIndex: number) => dispatch({ type: 'bulletInserted', slideId, afterIndex }),
    deleteBullet: (slideId: number, bulletIndex: number) => dispatch({ type: 'bulletDeleted', slideId, bulletIndex }),
    addSlide: (afterSlideId?: number) => dispatch({ type: 'slideAdded', afterSlideId }),
    moveSlide: (slideId: number, toIndex: number) => dispatch({ type: 'slideMoved', slideId, toIndex }),
    duplicateSlide: (slideId: number) => dispatch({ type: 'slideDuplicated', slideId }),
    deleteSlide: (slideId: number) => dispatch({ type: 'slideDeleted', slideId }),
    regenerateImage,
    selectLibraryImage: (slideId: number, base64: string, metadata: ImageMetadata) =>
      dispatch({ type: 'libraryImageSelected', slideId, base64, metadata }),
  };
}
