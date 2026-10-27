'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { partWantsAutoImage } from '@/lib/pedagogy';
import { FAILED_IMAGE } from '@/lib/slide-image';

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
  const imageLoads = useRef(new Map<SessionOption, { controller: AbortController; slideIds: Set<number> }>());
  const imageQueue = useRef<{ signal: AbortSignal; run: () => Promise<void> }[]>([]);
  const activeImageRequests = useRef(0);
  const drainImageQueue = useCallback(function drain() {
    while (activeImageRequests.current < 3 && imageQueue.current.length > 0) {
      const request = imageQueue.current.shift()!;
      if (request.signal.aborted) continue;
      activeImageRequests.current++;
      void request.run().finally(() => {
        activeImageRequests.current--;
        drain();
      });
    }
  }, []);
  const abortImageLoads = useCallback(() => {
    imageLoads.current.forEach(({ controller }) => controller.abort());
    imageLoads.current.clear();
    imageQueue.current = [];
  }, []);
  useEffect(() => abortImageLoads, [abortImageLoads]);
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

  // The shared queue caps automatic requests across sessions; switching keeps their loads alive.
  const loadPresentation = (data: PresentationData, session: SessionOption = 'Session 1') => {
    imageLoads.current.get(session)?.controller.abort();
    dispatchSession({ type: 'sessionLoaded', session, presentation: data });
    const controller = new AbortController();
    const requests = stateRef.current.slides.flatMap((slide, slideIndex) =>
      partWantsAutoImage(slide.content.part) && slide.content.visualDescription.trim()
        ? [{ token: { slideId: slide.id, version: slide.image.version }, slideIndex, prompt: slide.content.visualDescription }]
        : []);
    imageLoads.current.set(session, { controller, slideIds: new Set(requests.map(({ token }) => token.slideId)) });
    for (const { token, slideIndex, prompt } of requests) {
      imageQueue.current.push({ signal: controller.signal, run: async () => {
        const current = sessionsRef.current.decks[session]?.deck.slides.find(slide => slide.id === token.slideId);
        // A deleted slide or a newer image intent needs no queued automatic request.
        if (controller.signal.aborted || !current || current.image.version !== token.version ||
          !partWantsAutoImage(current.content.part) || !current.content.visualDescription.trim()) return;
        let image = FAILED_IMAGE;
        try {
          const response = await fetch('/api/generate-image', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, slideIndex, variation: 0 }), signal: controller.signal,
          });
          if (controller.signal.aborted) return;
          const result = await response.json();
          if (response.ok && typeof result?.base64 === 'string' && result.base64.length > 0) image = result.base64;
        } catch {
          // Automatic failures are visible in the workspace; aborts leave no late state.
        }
        if (controller.signal.aborted) return;
        dispatch({ type: 'batchImagesResolved', tokens: [token], images: { 0: image } });
      } });
    }
    drainImageQueue();
  };

  // Single slide image generation / regeneration
  const regenerateImage = async (slideId: number, visualDescription: string) => {
    const slideIndex = stateRef.current.slides.findIndex((s) => s.id === slideId);
    if (slideIndex === -1) return;
    const session = sessionsRef.current.activeSession;
    const signal = session ? imageLoads.current.get(session)?.controller.signal : undefined;
    if (signal?.aborted) return;
    dispatch({ type: 'regenerationStarted', slideId });
    const version = stateRef.current.slides.find((s) => s.id === slideId)!.image.version;
    const token: ImageToken = { slideId, version };
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // The version rises with every Image intent, so each regenerate asks for a different photo.
        body: JSON.stringify({ prompt: visualDescription, slideIndex, variation: token.version }),
        signal,
      });
      const resText = await res.text();
      if (signal?.aborted) return;
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
      if (signal?.aborted) return;
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

  const imageProgress = { loading: 0, done: 0, failed: 0 };
  const automaticIds = sessionsState.activeSession ? imageLoads.current.get(sessionsState.activeSession)?.slideIds : undefined;
  for (const slide of state.slides) {
    if (!automaticIds?.has(slide.id) || !partWantsAutoImage(slide.content.part) || !slide.content.visualDescription.trim()) continue;
    if (slide.image.status === 'ready') imageProgress.done++;
    else if (slide.image.status === 'failed') imageProgress.failed++;
    else imageProgress.loading++;
  }

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
    imageProgress,
    slideIds,
    loadPresentation,
    reset: () => { abortImageLoads(); setThemeId(readThemePreference()); dispatchSession({ type: 'reset' }); },
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
